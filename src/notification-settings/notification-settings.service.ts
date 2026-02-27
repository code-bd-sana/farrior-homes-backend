import { Injectable } from '@nestjs/common';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationSetting } from './entities/notification-setting.entity';
import { Model } from 'mongoose';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectModel(NotificationSetting.name)
    private readonly NotificaitonSettingModel: Model<NotificationSetting>,
  ) {}

  async create(createNotificationSettingDto: CreateNotificationSettingDto) {
    const created = await new this.NotificaitonSettingModel(
      createNotificationSettingDto,
    );
    return created;
  }

  findAll() {
    return `This action returns all notificationSettings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notificationSetting`;
  }

  update(
    id: number,
    updateNotificationSettingDto: UpdateNotificationSettingDto,
  ) {
    return `This action updates a #${id} notificationSetting`;
  }

  remove(id: number) {
    return `This action removes a #${id} notificationSetting`;
  }
}
