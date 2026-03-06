import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from 'src/config/app.config';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject('MAIL_SERVICE') private readonly client: ClientProxy,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.MAIL_HOST,
      port: Number(config.MAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.MAIL_USER,
        pass: config.MAIL_PASS,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
        ...options,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw error;
    }
  }

  /**
   * Send bulk mail by queueing individual email jobs.
   * This offloads the work to the RabbitMQ workers.
   */
  async sendBulkMail(options: {
    to: string[];
    subject: string;
    html: string;
    text?: string;
  }) {
    const { to, ...rest } = options;
    
    // Queue each email as a background task
    to.forEach(async (email) => {
      await this.enqueueMail({ to: email, ...rest });
    });

    this.logger.log(`Bulk mail requested: ${to.length} emails queued for processing.`);
    return { success: true, queuedCount: to.length };
  }

  /**
   * Pushes an email task to the RabbitMQ queue.
   */
  async enqueueMail(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    retryCount?: number;
  }) {
    try {
      this.client.emit('send_mail', data);
    } catch (error) {
      this.logger.error('Failed to enqueue email', error);
      throw error;
    }
  }
}
