import { Injectable } from '@nestjs/common';
import { CreateNotificationSettingDto } from './dto/create-notification-setting.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationSettings } from 'src/schemas/notification.settngs.schema';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectModel(NotificationSettings.name)
    private readonly notificationSettingModel: Model<NotificationSettings>,
  ) {}

  async create(createNotificationSettingDto: CreateNotificationSettingDto) {
    const newNotificationSetting = new this.notificationSettingModel(
      createNotificationSettingDto,
    );
    const created = await newNotificationSetting.save();
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
