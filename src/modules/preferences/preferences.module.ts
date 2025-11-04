import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { UserPreference } from '../../database/entities/user-preference.entity';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreference])],
  controllers: [PreferencesController],
  providers: [PreferencesService, JwtAuthGuard],
})
export class PreferencesModule {}
