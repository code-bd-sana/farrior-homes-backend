import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoIdDto } from 'src/common/dto/mongoId.dto';
import { AuthUser } from 'src/common/interface/auth-user.interface';
import { config } from 'src/config/app.config';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from 'src/schemas/payment.schema';
import Stripe from 'stripe';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    const secretKey = config.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY not set');

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
    });
  }

  async createCheckoutSession(
    userId: string,
    options?: { successUrl?: string; cancelUrl?: string },
  ): Promise<{
    transactionId: string;
    checkoutSessionId: string;
    checkoutSessionUrl: string | null;
    successUrl: string;
    cancelUrl: string;
    amount: number;
    currency: string;
    billingInterval: string;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.isSubscribed) {
      throw new BadRequestException('You already have an active subscription');
    }
    if (user.isSuspended) {
      throw new BadRequestException('Suspended users cannot create payments');
    }

    const stripePriceId =
      config.STRIPE_MONTHLY_PRICE_ID || config.STRIPE_PRICE_ID;
    const monthlyPriceFromEnv = config.STRIPE_MONTHLY_PRICE;
    const configuredCurrency = (config.STRIPE_CURRENCY || 'usd').toLowerCase();

    const billingInterval = 'month';
    let amount = 0;
    let currency = configuredCurrency;
    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;

    if (monthlyPriceFromEnv) {
      const amountInMinorUnit =
        this.convertMajorUnitToMinorUnit(monthlyPriceFromEnv);
      amount = this.convertMinorUnitToMajorUnit(amountInMinorUnit);

      lineItem = {
        price_data: {
          currency,
          unit_amount: amountInMinorUnit,
          recurring: {
            interval: 'month',
          },
          product_data: {
            name: 'Farrior Homes Premium Monthly',
          },
        },
        quantity: 1,
      };
    } else {
      if (!stripePriceId) {
        throw new BadRequestException(
          'Set STRIPE_MONTHLY_PRICE (for direct monthly amount) or STRIPE_MONTHLY_PRICE_ID/STRIPE_PRICE_ID',
        );
      }

      let stripePrice: Stripe.Price;
      try {
        stripePrice = await this.stripe.prices.retrieve(stripePriceId);
      } catch (error) {
        throw new BadRequestException(
          `Unable to load Stripe price: ${this.getStripeErrorMessage(error)}`,
        );
      }

      const stripeBillingInterval = stripePrice.recurring?.interval;
      if (!stripeBillingInterval) {
        throw new BadRequestException(
          'STRIPE_PRICE_ID must reference a recurring Stripe price',
        );
      }

      if (stripeBillingInterval !== 'month') {
        throw new BadRequestException(
          'STRIPE_PRICE_ID must point to a monthly recurring Stripe price',
        );
      }

      if (stripePrice.unit_amount == null) {
        throw new BadRequestException('Stripe price unit amount is missing');
      }

      amount = this.convertMinorUnitToMajorUnit(stripePrice.unit_amount);
      currency = (stripePrice.currency || configuredCurrency).toLowerCase();

      lineItem = {
        price: stripePriceId,
        quantity: 1,
      };
    }

    // Create pending payment in DB to link with Stripe session (for later verification in webhook)
    const pendingPayment = await this.paymentModel.create({
      user: new Types.ObjectId(userId),
      amount,
      currency,
      billingInterval,
      status: PaymentStatus.PENDING,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });

    const frontendBaseUrl = config.FRONTEND_BASE_URL;

    const successUrl =
      options?.successUrl ||
      `${frontendBaseUrl}/dashboard/profile/subscription?payment=success`;
    const cancelUrl =
      options?.cancelUrl ||
      `${frontendBaseUrl}/dashboard/profile/subscription?payment=cancelled`;

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: pendingPayment._id.toString(), // very important for webhook
        metadata: {
          userId: userId.toString(),
          billingInterval,
        },
        subscription_data: {
          metadata: {
            userId: userId.toString(),
          },
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Unable to create Stripe checkout session: ${this.getStripeErrorMessage(error)}`,
      );
    }

    // Save session id
    await this.paymentModel.findByIdAndUpdate(pendingPayment._id, {
      stripeCheckoutSessionId: session.id,
    });

    return {
      transactionId: pendingPayment.transactionId,
      checkoutSessionId: session.id,
      checkoutSessionUrl: session.url ?? null,
      successUrl,
      cancelUrl,
      amount: pendingPayment.amount,
      currency: pendingPayment.currency,
      billingInterval: pendingPayment.billingInterval || 'month',
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = config.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const paymentId = session.client_reference_id;
        if (!paymentId) {
          console.warn('No client_reference_id in session');
          return;
        }

        const payment = await this.paymentModel.findById(paymentId);
        if (!payment) {
          console.warn(`Payment not found: ${paymentId}`);
          return;
        }

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        // Mark as completed
        const transactionRef =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : subscriptionId || payment.transactionId;

        await this.paymentModel.findByIdAndUpdate(paymentId, {
          status: PaymentStatus.COMPLETED,
          transactionId: transactionRef,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : undefined,
          stripeSubscriptionId: subscriptionId,
          lifetimeAccessGranted: false,
          paidAt: new Date(),
        });

        // Grant access
        await this.userModel.findByIdAndUpdate(payment.user, {
          isSubscribed: true,
        });

        console.log(`Monthly subscription activated for user ${payment.user}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateUserSubscriptionByStripeSubscriptionId(
          subscription.id,
          this.isSubscriptionActive(subscription.status),
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateUserSubscriptionByStripeSubscriptionId(
          subscription.id,
          false,
        );
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await this.updateUserSubscriptionByStripeSubscriptionId(
            subscriptionId,
            true,
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = this.getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await this.updateUserSubscriptionByStripeSubscriptionId(
            subscriptionId,
            false,
          );
        }
        break;
      }

      case 'checkout.session.expired':
        {
          const session = event.data.object as Stripe.Checkout.Session;
          const paymentId = session.client_reference_id;
          if (paymentId) {
            await this.paymentModel.findByIdAndUpdate(paymentId, {
              status: PaymentStatus.FAILED,
            });
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  async create(user: AuthUser) {
    const data = await this.createCheckoutSession(user.userId, {
      successUrl: `${config.FRONTEND_BASE_URL}/dashboard/profile/subscription?payment=success`,
      cancelUrl: `${config.FRONTEND_BASE_URL}/dashboard/profile/subscription?payment=cancelled`,
    });

    return {
      message: 'Checkout session created successfully',
      data,
    };
  }

  async findAll() {
    const payments = await this.paymentModel
      .find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email role');

    return {
      message: 'Payments fetched successfully',
      data: payments,
    };
  }

  async findMyHistory(user: AuthUser) {
    this.ensureValidObjectId(user.userId);

    const payments = await this.paymentModel
      .find({ user: new Types.ObjectId(user.userId) })
      .sort({ createdAt: -1 });

    return {
      message: 'Payment history fetched successfully',
      data: payments,
    };
  }

  async findOne(id: MongoIdDto['id']) {
    this.ensureValidObjectId(id);

    const payment = await this.paymentModel
      .findById(id)
      .populate('user', 'name email role');
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      message: 'Payment fetched successfully',
      data: payment,
    };
  }

  private ensureValidObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
  }

  private convertMinorUnitToMajorUnit(amountInMinorUnit: number): number {
    return Number((amountInMinorUnit / 100).toFixed(2));
  }

  private convertMajorUnitToMinorUnit(amountInMajorUnit: string): number {
    const parsed = Number(amountInMajorUnit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(
        'STRIPE_MONTHLY_PRICE must be a positive number, for example 19.99',
      );
    }

    return Math.round(parsed * 100);
  }

  private isSubscriptionActive(status: Stripe.Subscription.Status): boolean {
    return status === 'active' || status === 'trialing';
  }

  private getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    const invoiceWithSubscription = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
      parent?: {
        subscription_details?: {
          subscription?: string | null;
        };
      };
    };

    const subscription =
      invoiceWithSubscription.subscription ||
      invoiceWithSubscription.parent?.subscription_details?.subscription;

    if (!subscription) {
      return null;
    }

    if (typeof subscription === 'string') {
      return subscription;
    }

    return subscription.id;
  }

  private async updateUserSubscriptionByStripeSubscriptionId(
    stripeSubscriptionId: string,
    isSubscribed: boolean,
  ): Promise<void> {
    const latestPayment = await this.paymentModel
      .findOne({ stripeSubscriptionId })
      .sort({ createdAt: -1 });

    if (!latestPayment) {
      console.warn(
        `No payment found for Stripe subscription ${stripeSubscriptionId}`,
      );
      return;
    }

    await this.userModel.findByIdAndUpdate(latestPayment.user, {
      isSubscribed,
    });
  }

  private getStripeErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return 'Stripe request failed';
    }

    const stripeError = error as {
      code?: string;
      message?: string;
      type?: string;
    };

    if (stripeError.code === 'resource_missing') {
      return (
        `${stripeError.message || 'Resource not found'} ` +
        '(check the price ID and ensure your Stripe key mode matches: test vs live)'
      );
    }

    if (stripeError.message) {
      return stripeError.message;
    }

    if (stripeError.type) {
      return stripeError.type;
    }

    return 'Stripe request failed';
  }
}
