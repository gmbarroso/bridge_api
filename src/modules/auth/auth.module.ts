import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ApiKeyService } from './api-key.service';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { VerificationToken } from '../../database/entities/verification-token.entity';
import { User } from '../../database/entities/user.entity';
import { OrganizationInvitesController } from './organization-invites.controller';
import { DevAdminGuard } from './guards/dev-admin.guard';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetController } from './password-reset.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, VerificationToken, User, RefreshToken, PasswordResetToken])],
  providers: [ApiKeyService, InviteService, DevAdminGuard, AuthService, PasswordResetService],
  controllers: [InviteController, OrganizationInvitesController, AuthController, PasswordResetController],
  exports: [ApiKeyService, AuthService],
})
export class AuthModule {}