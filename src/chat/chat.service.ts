/**
 * @fileoverview Core Chat service.
 *
 * Handles all MongoDB interactions for the chat system:
 *   - Creating / finding conversations
 *   - Listing conversations per user
 *   - Cursor-paginated message history
 *   - Bulk message persistence (called by the RabbitMQ consumer)
 *   - Updating lastMessage snapshot on Conversation after flush
 */

import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AwsService } from 'src/common/aws/aws.service';
import { Conversation, ConversationDocument } from 'src/schemas/conversation.schema';
import { Message, MessageDocument as MessageDoc, MessageStatus } from 'src/schemas/message.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import {
  MessageDocument,
  MessagePayload,
  MessageResponse,
  PaginatedMessages,
} from './interfaces/chat.interfaces';
import { AttachmentService } from './services/attachment.service';
import { REDIS_COMMANDS } from 'src/redis/redis.constants';
import Redis from 'ioredis';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDoc>,

    private readonly attachmentService: AttachmentService,

    @Inject(REDIS_COMMANDS.REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVERSATION OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new conversation or returns an existing one.
   *
   * For 1-on-1 chats: if a conversation already exists between the two
   * participants, it is returned instead of creating a duplicate.
   *
   * For group chats: always creates a new conversation.
   *
   * @param dto    - Validated CreateConversationDto from the controller.
   * @param userId - Authenticated user's MongoDB ObjectId string.
   */
  async createConversation(
    dto: CreateConversationDto,
    userId: string,
  ): Promise<ConversationDocument> {
    const allParticipantIds = [userId, ...dto.participantIds].map(
      (id) => new Types.ObjectId(id),
    );

    const uniqueIds = [
      ...new Map(allParticipantIds.map((id) => [id.toString(), id])).values(),
    ];

    const propertyObjectId = new Types.ObjectId(dto.propertyId);

    // For 1-on-1 conversations, try to find an existing one for the same property first
    if (uniqueIds.length === 2) {
      const existing = await this.conversationModel
        .findOne({
          // $all with $size guarantees EXACT match (no extra participants)
          participants: { $all: uniqueIds, $size: 2 },
          property: propertyObjectId,
        })
        .populate('participants', 'name email profileImage')
        .populate('property', 'propertyName address price bedrooms bathrooms squareFeet thumbnail');
      if (existing) {
        if (!existing.directKey) {
          try {
            existing.directKey = directKey;
            await existing.save();
          } catch {
            // ignore duplicate key race; existing conversation can still be used
          }
        }
        return existing;
      }
    }

    const created = await this.conversationModel.create({
      participants: uniqueIds,
      property: propertyObjectId,
    });

    // Return populated document
    const conversation = await this.conversationModel
      .findById(created._id)
      .populate('participants', 'name email profileImage')
      .populate('property', 'propertyName address price bedrooms bathrooms squareFeet thumbnail');

    this.logger.log(`Created new conversation: ${created._id}`);
    return conversation as ConversationDocument;
  }

  /**
   * Returns a cursor-paginated page of conversations for a user,
   * sorted by most recent activity (newest first).
   *
   * HOW CURSOR PAGINATION WORKS:
   *   - On the first request: no cursor → return the latest `limit` conversations.
   *   - On subsequent requests: cursor = ISO timestamp of the OLDEST conversation
   *     from the previous page → fetch conversations with `lastMessageAt` OLDER
   *     than that timestamp (scroll-down loads older chats).
   *
   * @param userId - Authenticated user's MongoDB ObjectId string.
   * @param cursor - Optional ISO-8601 timestamp cursor from a previous response.
   * @param limit  - Number of conversations per page (default 20).
   */
  async getUserConversations(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{
    conversations: ConversationDocument[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const query: Record<string, unknown> = {
      participants: new Types.ObjectId(userId),
    };

    // If cursor provided, only fetch conversations older than the cursor timestamp
    if (cursor) {
      query['lastMessageAt'] = { $lt: new Date(cursor) };
    }

    // Fetch one extra record to determine whether there are more pages
    const fetchLimit = limit + 1;

    const rawConversations = await this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1 })
      .limit(fetchLimit)
      .select('-__v')
      .populate('participants', 'name email profileImage')
      .populate('property', 'propertyName address price bedrooms bathrooms squareFeet thumbnail')
      .lean()
      .exec() as unknown as ConversationDocument[];

    const hasMore = rawConversations.length > limit;
    const conversations = hasMore
      ? rawConversations.slice(0, limit)
      : rawConversations;

    // nextCursor = lastMessageAt of the last item in this page
    const lastConv = conversations[conversations.length - 1];
    const nextCursor =
      hasMore && lastConv
        ? (lastConv as unknown as { lastMessageAt?: string }).lastMessageAt ?? null
        : null;

    return { conversations, nextCursor, hasMore };
  }


  /**
   * Validates that a conversation exists and that the requesting user
   * is a participant.  Throws 404 / 403 as appropriate.
   *
   * @param conversationId - MongoDB ObjectId string.
   * @param userId         - Authenticated user's ObjectId string.
   */
  async validateParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversationId format');
    }

    const conversation = await this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      participants: new Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant',
      );
    }

    return conversation;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MESSAGE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns a cursor-paginated page of messages for a conversation.
   *
   * HOW CURSOR PAGINATION WORKS:
   *   - Messages are ordered by `createdAt` descending (newest first).
   *   - On the first request: no cursor → return the latest N messages.
   *   - On subsequent requests: cursor = ISO timestamp of the OLDEST message
   *     from the previous page → fetch messages OLDER than that timestamp.
   *   - Client scrolls UP → calls with `nextCursor` from the last response.
   *
   * @param dto - Validated GetMessagesDto (conversationId, cursor, limit).
   * @param userId - Authenticated user's MongoDB ObjectId string.
   */
  async getMessages(
    dto: GetMessagesDto,
    userId: string,
  ): Promise<PaginatedMessages> {
    const limit = dto.limit ?? 20;
    const userObjectId = new Types.ObjectId(userId);

    const query: Record<string, unknown> = {
      conversationId: new Types.ObjectId(dto.conversationId),
      deletedForUsers: { $ne: new Types.ObjectId(userId) },
    };

    if (dto.cursor) {
      query.createdAt = { $lt: new Date(dto.cursor) };
    }

    // ── Step 1: Fetch from MongoDB (already-persisted messages) ──────────────
    const mongoMessages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    // ── Step 2: Fetch buffered messages from Redis ────────────────────────────
    // These are messages enqueued via socket but not yet flushed to MongoDB.
    // `chat:buf:{conversationId}` is a sorted set (score = epoch ms).
    const bufferedMessages: MessageResponse[] = [];
    if (!dto.cursor) {
      // Only merge buffer on first page (no cursor) — older pages come from DB.
      try {
        const bufKey = `chat:buf:${dto.conversationId}`;
        // Get all buffered message IDs (newest first)
        const bufferedIds = await this.redis.zrevrange(bufKey, 0, -1);

        if (bufferedIds.length > 0) {
          const msgKeys = bufferedIds.map((id) => `chat:msg:${id}`);
          const rawMessages = await this.redis.mget(...msgKeys);

          for (const raw of rawMessages) {
            if (!raw) continue;
            try {
              const p = JSON.parse(raw) as MessagePayload;
              // Filter out messages deleted for this user
              if (p.deletedForUsers?.includes(userId)) continue;
              // Filter out messages older than cursor (safety check)
              bufferedMessages.push({
                _id: p._id,
                conversationId: p.conversationId,
                senderId: p.senderId,
                message: p.isUnsent ? '' : p.message,
                attachments: p.isUnsent ? [] : (p.attachments ?? []),
                status: p.status ?? 'sent',
                isForwarded: p.isForwarded ?? false,
                originalMessageId: p.originalMessageId ?? null,
                forwardedBy: p.forwardedBy ?? null,
                isUnsent: p.isUnsent ?? false,
                createdAt: p.createdAt,
              });
            } catch {
              // Skip malformed Redis entries
            }
          }
        }
      } catch (err) {
        // Redis read failure is non-fatal — fall back to MongoDB-only results
        this.logger.warn('Redis buffer read failed (non-fatal):', err);
      }
    }

    // ── Step 3: Convert MongoDB documents to MessageResponse ─────────────────
    const dbMessages: MessageResponse[] = mongoMessages.map((m) => ({
      _id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId.toString(),
      message: m.message,
      attachments: m.attachments as MessageResponse['attachments'],
      status: m.status,
      isForwarded: m.isForwarded,
      originalMessageId: m.originalMessageId ? m.originalMessageId.toString() : null,
      forwardedBy: m.forwardedBy ? m.forwardedBy.toString() : null,
      isUnsent: m.isUnsent,
      createdAt: (m.createdAt as Date).toISOString(),
    }));

    // ── Step 4: Merge + deduplicate by _id ───────────────────────────────────
    // Buffered messages take precedence (they have the latest unsent/deleted state).
    const dbIdSet = new Set(dbMessages.map((m) => m._id));
    const uniqueBuffered = bufferedMessages.filter((m) => !dbIdSet.has(m._id));
    const merged = [...uniqueBuffered, ...dbMessages];

    // Sort newest-first and truncate to the requested page size
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const page = merged.slice(0, limit);

    // nextCursor is the createdAt of the oldest message in this page
    const nextCursor =
      mongoMessages.length === limit
        ? (mongoMessages[mongoMessages.length - 1].createdAt as Date).toISOString()
        : null;

    return {
      messages: page,
      nextCursor,
      count: page.length,
    };
  }

  async createMessage(dto: CreateMessageDto, userId: string): Promise<MessageResponse> {
    await this.validateParticipant(dto.conversationId, userId);

    const messageText = (dto.message ?? '').trim();
    const attachments = dto.attachments ?? [];

    if (!messageText && attachments.length === 0) {
      throw new BadRequestException('Message text or attachments are required');
    }

    const createdAt = new Date();
    const created = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: new Types.ObjectId(userId),
      message: messageText,
      attachments,
      status: MessageStatus.SENT,
      unsentForEveryone: false,
      deletedFor: [],
      createdAt,
    });

    await this.conversationModel.updateOne(
      { _id: new Types.ObjectId(dto.conversationId) },
      {
        $set: {
          lastMessage: messageText || 'Attachment',
          lastMessageAt: createdAt,
        },
      },
    );

    const populated = await this.messageModel
      .findById(created._id)
      .populate({
        path: 'senderId',
        select: 'name profileImage isOnline lastActiveAt',
      })
      .lean()
      .exec();

    if (!populated) {
      throw new NotFoundException('Message not found after creation');
    }

    return this.mapMessageResponse(populated as any);
  }

  async unsendMessage(messageId: string, userId: string) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid messageId format');
    }

    const updated = await this.messageModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(messageId),
        senderId: new Types.ObjectId(userId),
      },
      {
        $set: {
          unsentForEveryone: true,
          message: '',
          attachments: [],
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    const conversationId = updated.conversationId.toString();
    await this.refreshConversationLastMessage(conversationId);

    return {
      success: true,
      messageId: updated._id.toString(),
      conversationId,
      message: {
        _id: updated._id.toString(),
        conversationId,
        senderId: updated.senderId.toString(),
        message: '',
        attachments: [],
        status: updated.status,
        unsentForEveryone: true,
        forwardedFrom: updated.forwardedFrom
          ? updated.forwardedFrom.toString()
          : null,
        deletedFor: Array.isArray(updated.deletedFor)
          ? updated.deletedFor.map((id: any) => id?.toString?.() ?? String(id))
          : [],
        createdAt: new Date(updated.createdAt).toISOString(),
      } as MessageResponse,
    };
  }

  async deleteMessageForMe(messageId: string, userId: string) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid messageId format');
    }

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.validateParticipant(message.conversationId.toString(), userId);

    const conversationId = message.conversationId.toString();
    await this.messageModel.updateOne(
      { _id: new Types.ObjectId(messageId) },
      { $addToSet: { deletedFor: new Types.ObjectId(userId) } },
    );

    return { success: true, messageId, conversationId, userId };
  }

  async forwardMessage(
    messageId: string,
    dto: ForwardMessageDto,
    userId: string,
  ): Promise<MessageResponse> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid messageId format');
    }

    const sourceMessage = await this.messageModel.findById(messageId).lean();
    if (!sourceMessage) {
      throw new NotFoundException('Source message not found');
    }

    await this.validateParticipant(sourceMessage.conversationId.toString(), userId);
    await this.validateParticipant(dto.targetConversationId, userId);

    if (sourceMessage.unsentForEveryone) {
      throw new BadRequestException('Cannot forward an unsent message');
    }

    const createdAt = new Date();
    const created = await this.messageModel.create({
      conversationId: new Types.ObjectId(dto.targetConversationId),
      senderId: new Types.ObjectId(userId),
      message: sourceMessage.message,
      attachments: sourceMessage.attachments ?? [],
      status: MessageStatus.SENT,
      unsentForEveryone: false,
      forwardedFrom: sourceMessage._id,
      deletedFor: [],
      createdAt,
    });

    await this.conversationModel.updateOne(
      { _id: new Types.ObjectId(dto.targetConversationId) },
      {
        $set: {
          lastMessage: sourceMessage.message || 'Attachment',
          lastMessageAt: createdAt,
        },
      },
    );

    const populated = await this.messageModel
      .findById(created._id)
      .populate({
        path: 'senderId',
        select: 'name profileImage isOnline lastActiveAt',
      })
      .lean()
      .exec();

    if (!populated) {
      throw new NotFoundException('Forwarded message not found after creation');
    }

    return this.mapMessageResponse(populated as any);
  }

  async markConversationSeen(conversationId: string, userId: string) {
    await this.validateParticipant(conversationId, userId);

    const result = await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        status: { $ne: MessageStatus.SEEN },
        deletedFor: { $ne: new Types.ObjectId(userId) },
      },
      { $set: { status: MessageStatus.SEEN } },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async setUserPresence(userId: string, isOnline: boolean): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      return;
    }

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          isOnline,
          ...(isOnline ? {} : { lastActiveAt: new Date() }),
        },
      },
    );
  }

  async getPresence(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('isOnline lastActiveAt name')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId,
      name: user.name,
      isOnline: Boolean(user.isOnline),
      lastActiveAt: user.lastActiveAt
        ? new Date(user.lastActiveAt).toISOString()
        : null,
    };
  }

  async bulkSaveMessages(payloads: MessagePayload[]): Promise<number> {
    if (payloads.length === 0) return 0;

    const docs: MessageDocument[] = payloads.map((p) => ({
      _id: new Types.ObjectId(p._id),
      conversationId: new Types.ObjectId(p.conversationId),
      senderId: new Types.ObjectId(p.senderId),
      message: p.message,
      attachments: p.attachments ?? [],
      status: p.status ?? MessageStatus.SENT,
      isForwarded: p.isForwarded ?? false,
      originalMessageId: p.originalMessageId ? new Types.ObjectId(p.originalMessageId) : null,
      forwardedBy: p.forwardedBy ? new Types.ObjectId(p.forwardedBy) : null,
      isUnsent: p.isUnsent ?? false,
      deletedForUsers: p.deletedForUsers ? p.deletedForUsers.map(id => new Types.ObjectId(id)) : [],
      createdAt: new Date(p.createdAt),
    }));

    const result = await this.messageModel.insertMany(docs, { ordered: false });
    const savedCount = result.length;

    const latestByConversation = new Map<string, MessagePayload>();
    for (const payload of payloads) {
      const existing = latestByConversation.get(payload.conversationId);
      if (!existing || new Date(payload.createdAt) > new Date(existing.createdAt)) {
        latestByConversation.set(payload.conversationId, payload);
      }
    }

    const conversationUpdates = [...latestByConversation.values()].map((latest) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(latest.conversationId) },
        update: {
          $set: {
            lastMessage: latest.message,
            lastMessageAt: new Date(latest.createdAt),
          },
        },
      },
    }));

    if (conversationUpdates.length > 0) {
      await this.conversationModel.bulkWrite(conversationUpdates, {
        ordered: false,
      });
    }

    this.logger.log(`Bulk saved ${savedCount}/${payloads.length} messages`);

    return savedCount;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT-DRIVEN MESSAGE MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Unsends a message. Sets isUnsent to true, clears text, and removes attachments.
   * If attachments exist, safely deletes them from S3 (if unused elsewhere).
   * @returns true if message was found and updated, otherwise false.
   */
  async unsendMessage(messageId: string, userId: string): Promise<boolean> {
    const msg = await this.messageModel.findOne({
      _id: new Types.ObjectId(messageId),
      senderId: new Types.ObjectId(userId),
    });

    if (!msg) return false;
    if (msg.isUnsent) return true; // Already unsent

    const attachmentsToClean = msg.attachments ? [...msg.attachments] : [];

    msg.isUnsent = true;
    msg.message = 'This message was unsent';
    msg.attachments = [];
    await msg.save();

    // After saving changes, evaluate S3 files for cleanup safely
    for (const att of attachmentsToClean) {
      await this.attachmentService.deleteAttachmentIfUnused(att.key);
    }

    return true;
  }

  /**
   * Marks a message as deleted for the specified user (only hides it from their view).
   */
  async deleteMessageForMe(messageId: string, userId: string): Promise<boolean> {
    const result = await this.messageModel.updateOne(
      { _id: new Types.ObjectId(messageId) },
      { $addToSet: { deletedForUsers: new Types.ObjectId(userId) } }
    );
    return result.modifiedCount > 0 || result.matchedCount > 0;
  }

  /**
   * Removes a single attachment from a message by key, and safely deletes from S3 if unused.
   */
  async deleteAttachmentFromMessage(messageId: string, attachmentKey: string, userId: string): Promise<boolean> {
    const msg = await this.messageModel.findOne({
      _id: new Types.ObjectId(messageId),
      senderId: new Types.ObjectId(userId), // Only sender can remove attachment
    });

    if (!msg || !msg.attachments) return false;

    const attachmentIndex = msg.attachments.findIndex((a) => a.key === attachmentKey);
    if (attachmentIndex === -1) return false;

    // Remove it from array
    msg.attachments.splice(attachmentIndex, 1);
    await msg.save();

    // Check if we can delete from S3
    await this.attachmentService.deleteAttachmentIfUnused(attachmentKey);

    return true;
  }
}
