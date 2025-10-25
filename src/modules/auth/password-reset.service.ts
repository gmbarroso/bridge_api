import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { User } from '../../database/entities/user.entity';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PasswordResetToken) private readonly prRepo: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateToken() {
    const raw = randomBytes(32).toString('base64url');
    const hash = this.hashToken(raw);
    return { raw, hash };
  }

  private defaultExpiryMs() {
    const mins = Number(process.env.PASSWORD_RESET_TTL_MIN || 60);
    return mins * 60 * 1000;
  }

  async requestReset(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Não vazar existência de conta
      return { message: 'Se o e-mail existir, enviaremos instruções.' };
    }

    const { raw, hash } = this.generateToken();
    const expiresAt = new Date(Date.now() + this.defaultExpiryMs());

    await this.prRepo.save({
      user_id: user.id,
      token_hash: hash,
      expires_at: expiresAt,
      used_at: null,
    });

    // Em produção: enviar e-mail com link contendo raw token
    // Para dev: opcionalmente retornar token
    const devMode = (process.env.NODE_ENV || 'development') !== 'production';
    return devMode
      ? { message: 'Token gerado', token: raw, expiresAt: expiresAt.toISOString() }
      : { message: 'Se o e-mail existir, enviaremos instruções.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = this.hashToken(token);
    const row = await this.prRepo.findOne({ where: { token_hash: hash } });
    if (!row || row.used_at || row.expires_at < new Date()) {
      return { ok: false, message: 'Token inválido ou expirado' };
    }

    const user = await this.userRepo.findOne({ where: { id: row.user_id } });
    if (!user) {
      return { ok: false, message: 'Usuário não encontrado' };
    }

    const password_algo = 'argon2id';
    const password_hash = await argon2.hash(newPassword, { type: argon2.argon2id });

    user.password_hash = password_hash;
    user.password_algo = password_algo;
    user.password_salt = '';
    await this.userRepo.save(user);

    // Marcar token como usado
    row.used_at = new Date();
    await this.prRepo.save(row);

    // Revogar refresh tokens ativos
    const rts = await this.refreshRepo.find({ where: { user_id: user.id } });
    for (const rt of rts) {
      if (!rt.revoked_at) {
        rt.revoked_at = new Date();
        await this.refreshRepo.save(rt);
      }
    }

    return { ok: true, message: 'Senha atualizada com sucesso' };
  }
}
