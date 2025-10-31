import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ApiKeyService } from './api-key.service';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, User, RefreshToken])],
  providers: [ApiKeyService, AuthService],
  controllers: [AuthController],
  exports: [ApiKeyService, AuthService],
})
export class AuthModule {}
