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

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from 'src/schemas/conversation.schema';
import { Message, MessageDocument as MessageDoc } from 'src/schemas/message.schema';
import { MessageStatus } from 'src/schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import {
  MessageDocument,
  MessagePayload,
  MessageResponse,
  PaginatedMessages,
} from './interfaces/chat.interfaces';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDoc>,
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
    // Combine the requesting user with the given participant IDs
    const allParticipantIds = [
      userId,
      ...dto.participantIds,
    ].map((id) => new Types.ObjectId(id));

    // Remove duplicate IDs in case the client accidentally included themselves
    const uniqueIds = [
      ...new Map(allParticipantIds.map((id) => [id.toString(), id])).values(),
    ];

    // For 1-on-1 conversations, try to find an existing one first
    if (uniqueIds.length === 2) {
      const existing = await this.conversationModel.findOne({
        // $all with $size guarantees EXACT match (no extra participants)
        participants: { $all: uniqueIds, $size: 2 },
      });
      if (existing) {
        this.logger.debug(`Reusing existing 1-on-1 conversation: ${existing._id}`);
        return existing;
      }
    }

    const conversation = await this.conversationModel.create({
      participants: uniqueIds,
    });
    this.logger.log(`Created new conversation: ${conversation._id}`);
    return conversation;
  }

  /**
   * Returns all conversations for a user, sorted by most recent activity.
   *
   * @param userId - Authenticated user's MongoDB ObjectId string.
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ lastMessageAt: -1 }) // Most recent first
      .select('-__v')
      .lean()
      .exec() as unknown as ConversationDocument[];
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
   */
  async getMessages(dto: GetMessagesDto): Promise<PaginatedMessages> {
    const limit = dto.limit ?? 20;
    const query: Record<string, unknown> = {
      conversationId: new Types.ObjectId(dto.conversationId),
    };

    // Apply cursor: only fetch messages OLDER than the cursor timestamp
    if (dto.cursor) {
      query.createdAt = { $lt: new Date(dto.cursor) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 }) // Newest first within this page
      .limit(limit)
      .lean()
      .exec();

    // The nextCursor is the createdAt of the OLDEST message on this page.
    // Clients pass this on the next call to load even older messages.
    const nextCursor =
      messages.length === limit
        ? (messages[messages.length - 1].createdAt as Date).toISOString()
        : null;

    return {
      messages: messages.map((m) => ({
        _id: m._id.toString(),
        conversationId: m.conversationId.toString(),
        senderId: m.senderId.toString(),
        message: m.message,
        attachments: m.attachments,
        status: m.status,
        createdAt: (m.createdAt as Date).toISOString(),
      })) as MessageResponse[],
      nextCursor,
      count: messages.length,
    };
  }

  /**
   * Bulk-persists an array of message payloads to MongoDB.
   *
   * Called ONLY by the RabbitMQ consumer (ChatMessageConsumer) during a
   * batch flush.  Uses `insertMany` with `ordered: false` so a single
   * validation failure does not block the rest of the batch.
   *
   * After saving, updates the `lastMessage` / `lastMessageAt` snapshot
   * on all affected conversations in a single bulk write.
   *
   * @param payloads - Array of MessagePayload objects from RabbitMQ.
   * @returns        - Number of messages successfully saved.
   */
  async bulkSaveMessages(payloads: MessagePayload[]): Promise<number> {
    if (payloads.length === 0) return 0;

    // Map raw payloads to MongoDB document shape
    const docs: MessageDocument[] = payloads.map((p) => ({
      conversationId: new Types.ObjectId(p.conversationId),
      senderId: new Types.ObjectId(p.senderId),
      message: p.message,
      attachments: p.attachments ?? [],
      status: p.status ?? MessageStatus.SENT,
      createdAt: new Date(p.createdAt),
    }));

    // Bulk insert — ordered: false means partial success is acceptable
    const result = await this.messageModel.insertMany(docs, { ordered: false });
    const savedCount = result.length;

    this.logger.log(`Bulk saved ${savedCount}/${payloads.length} messages to MongoDB`);

    // ── Update lastMessage snapshot on each conversation ──────────────────
    // Group messages by conversationId and pick the most recent one
    const latestByConversation = new Map<string, MessagePayload>();
    for (const payload of payloads) {
      const existing = latestByConversation.get(payload.conversationId);
      if (!existing || new Date(payload.createdAt) > new Date(existing.createdAt)) {
        latestByConversation.set(payload.conversationId, payload);
      }
    }

    // Build a bulkWrite operation to update all affected conversations at once
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
      this.logger.debug(
        `Updated lastMessage on ${conversationUpdates.length} conversation(s)`,
      );
    }

    return savedCount;
  }
}
