/**
 * @fileoverview Global Mongoose connection module.
 *
 * Registers three connections against the same MongoDB URI:
 *
 * Import this module in any microservice root module that needs
 * database access.
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { config } from 'src/config/app.config';

/** Fallback URI used when the environment variable is unset. */
const MONGO_URI =
  config.MONGO_URI ?? 'mongodb://127.0.0.1:27017/office-management';

@Module({
  imports: [MongooseModule.forRoot(MONGO_URI)],
  exports: [MongooseModule],
})
export class MongooseConnectionsModule {}
