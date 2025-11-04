import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from '../../database/entities/user-preference.entity';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly preferencesRepo: Repository<UserPreference>,
  ) {}

  async getPreferences(userId: number): Promise<UserPreference> {
    let preferences = await this.preferencesRepo.findOne({ where: { user_id: userId } });
    if (!preferences) {
      preferences = this.preferencesRepo.create({ user_id: userId });
      await this.preferencesRepo.save(preferences);
    }
    return preferences;
  }

  async updatePreferences(userId: number, dto: UpdatePreferencesDto): Promise<UserPreference> {
    let preferences = await this.preferencesRepo.findOne({ where: { user_id: userId } });
    if (!preferences) {
      preferences = this.preferencesRepo.create({ user_id: userId });
    }

    if (dto.theme) {
      preferences.theme = dto.theme;
    }

    return this.preferencesRepo.save(preferences);
  }
}
