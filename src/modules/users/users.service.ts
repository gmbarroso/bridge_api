import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../database/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { UserSession } from '../../database/entities/user-session.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly authService: AuthService,
  ) {}

  async updateUser(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<{ user: User; tokens?: { accessToken: string; refreshToken: string } }> {
    const user = await this.findById(userId);
    let tokens: { accessToken: string; refreshToken: string } | undefined;

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatar_url = dto.avatarUrl || null;
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('A senha atual é obrigatória para trocar a senha');
      }

      const isPasswordValid = await argon2.verify(user.password_hash, dto.currentPassword);
      if (!isPasswordValid) {
        throw new UnauthorizedException('A senha atual está incorreta');
      }

      const isSamePassword = await argon2.verify(user.password_hash, dto.newPassword);
      if (isSamePassword) {
        throw new BadRequestException('A nova senha não pode ser igual à senha atual');
      }

      user.password_hash = await argon2.hash(dto.newPassword);
      await this.revokeSessionsAndTokens(user.id);
      tokens = await this.authService.issueTokensForUser(user);
    }

    const saved = await this.userRepo.save(user);
    return { user: saved, tokens };
  }

  async findById(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return user;
  }

  private async revokeSessionsAndTokens(userId: number) {
    await this.refreshRepo.update({ user_id: userId, revoked_at: IsNull() }, { revoked_at: new Date() });
    await this.sessionRepo.update({ user_id: userId }, { expires_at: new Date() });
  }
}
