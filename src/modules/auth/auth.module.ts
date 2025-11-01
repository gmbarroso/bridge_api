import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ApiKeyService } from './api-key.service';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserSession } from '../../database/entities/user-session.entity';
import { JwtAuthGuard } from './guards/jwt.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, User, RefreshToken, UserSession])],
  providers: [ApiKeyService, AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [ApiKeyService, AuthService, JwtAuthGuard, TypeOrmModule],
})
export class AuthModule {}
