import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { sign, verify, SignOptions } from 'jsonwebtoken';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { UserSession } from '../../database/entities/user-session.entity';

interface JwtPayload {
  sub: number; // user_id
  orgId: number;
  suborgId?: number | null;
  role: 'viewer' | 'agent' | 'manager' | 'admin';
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(UserSession) private readonly userSessionRepo: Repository<UserSession>,
  ) {}

  private getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
    return secret;
  }

  private getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET not set');
    return secret;
  }

  private parseTtlToSeconds(input?: string): number {
    const v = (input || '15m').trim();
    const m = v.match(/^(\d+)([smhd]?)$/i);
    if (!m) {
      // fallback 15 minutes
      return 15 * 60;
    }
    const num = Number(m[1]);
    const unit = (m[2] || 'm').toLowerCase();
    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 60 * 60;
      case 'd': return num * 60 * 60 * 24;
      default: return num; // default seconds
    }
  }

  private getAccessTtlSec() {
    return this.parseTtlToSeconds(process.env.JWT_ACCESS_TTL);
  }

  private getRefreshTtlMs(rememberMe?: boolean) {
    const defaultTtlDays = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);
    const rememberMeTtlDays = Number(process.env.JWT_REFRESH_REMEMBER_ME_TTL_DAYS || 90);
    const days = rememberMe ? rememberMeTtlDays : defaultTtlDays;
    return days * 24 * 60 * 60 * 1000;
  }

  private getRefreshExpiresAt(rememberMe?: boolean) {
    return new Date(Date.now() + this.getRefreshTtlMs(rememberMe));
  }

  private buildDeviceMetadata(meta?: { userAgent?: string | null; ip?: string | null }) {
    const deviceMetadata: Record<string, any> = {};
    if (meta?.userAgent) {
      deviceMetadata.userAgent = meta.userAgent;
    }
    if (meta?.ip) {
      deviceMetadata.ip = meta.ip;
    }
    return deviceMetadata;
  }

  private async persistSession(
    user: User,
    tokenRow: RefreshToken,
    rememberMe: boolean,
    meta?: { userAgent?: string | null; ip?: string | null },
  ) {
    const session = this.userSessionRepo.create({
      user_id: user.id,
      organization_id: user.organization_id,
      refresh_token_hash: tokenRow.token_hash,
      expires_at: this.getRefreshExpiresAt(rememberMe),
      remember_me: rememberMe,
      device_metadata: this.buildDeviceMetadata(meta),
    });
    await this.userSessionRepo.save(session);
  }

  private async expireSessionsByHash(hash: string) {
    await this.userSessionRepo.update(
      { refresh_token_hash: hash },
      { expires_at: new Date() },
    );
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.organization_id,
      suborgId: user.sub_organization_id,
      role: user.role,
      email: user.email,
    };
    const options: SignOptions = { expiresIn: this.getAccessTtlSec() };
    return sign(payload as object, this.getAccessSecret(), options);
  }

  private async issueRefreshToken(user: User, rememberMe: boolean, meta?: { userAgent?: string | null; ip?: string | null }) {
    const expiresInSec = Math.floor(this.getRefreshTtlMs(rememberMe) / 1000);
    const options: SignOptions = { expiresIn: expiresInSec };
    const raw = sign({ sub: user.id } as object, this.getRefreshSecret(), options);
    const token_hash = await argon2.hash(raw);
    const saved = await this.refreshRepo.save({
      user_id: user.id,
      token_hash,
      user_agent: meta?.userAgent || null,
      ip: meta?.ip || null,
      replaced_by_token_id: null,
      revoked_at: null,
    });
    await this.persistSession(user, saved, rememberMe, meta);
    return { refreshToken: raw, tokenRow: saved };
  }

  /**
   * Emite um novo par de tokens para um usuário já autenticado.
   * Útil em fluxos como troca de senha para manter a sessão atual.
   */
  async issueTokensForUser(
    user: User,
    rememberMe = false,
    meta?: { userAgent?: string | null; ip?: string | null },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken(user);
    const { refreshToken } = await this.issueRefreshToken(user, rememberMe, meta);
    return { accessToken, refreshToken };
  }

  async login(email: string, password: string, rememberMe = false, meta?: { userAgent?: string | null; ip?: string | null }) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (!user.password_hash) throw new UnauthorizedException('Credenciais inválidas');

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.is_active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (!user.organization_id) {
      throw new UnauthorizedException('Usuário sem organização');
    }

    if (!user.email_verified_at) {
      throw new UnauthorizedException('Email não verificado');
    }

    const accessToken = this.signAccessToken(user);
    const { refreshToken } = await this.issueRefreshToken(user, rememberMe, meta);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        public_id: user.public_id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        suborganization_id: user.sub_organization_id,
      }
    };
  }

  private isRefreshExpired(createdAt: Date, rememberMe?: boolean) {
    return createdAt.getTime() + this.getRefreshTtlMs(rememberMe) < Date.now();
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string | null; ip?: string | null }) {
    // Validate raw token signature/expiry first
    let decoded: any;
    try {
      decoded = verify(refreshToken, this.getRefreshSecret());
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Find by hash (store as argon2 hash, verify instead of equality)
    const tokens = await this.refreshRepo.find({ where: { user_id: decoded.sub }, order: { created_at: 'DESC' } });
    let tokenRow: RefreshToken | undefined;
    for (const row of tokens) {
      if (await argon2.verify(row.token_hash, refreshToken)) {
        tokenRow = row;
        break;
      }
    }
    if (!tokenRow) throw new UnauthorizedException('Refresh token inválido');

    const userSession = await this.userSessionRepo.findOne({ where: { refresh_token_hash: tokenRow.token_hash } });
    const rememberMe = userSession?.remember_me || false;

    if (tokenRow.revoked_at) throw new UnauthorizedException('Refresh token revogado');
    if (this.isRefreshExpired(tokenRow.created_at, rememberMe)) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: tokenRow.user_id } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    // Rotate: revoke old and issue new
    tokenRow.revoked_at = new Date();
    const newPair = await this.issueRefreshToken(user, rememberMe, meta);
    tokenRow.replaced_by_token_id = newPair.tokenRow.id;
    await this.refreshRepo.save(tokenRow);
    await this.expireSessionsByHash(tokenRow.token_hash);

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newPair.refreshToken };
  }

  async logout(refreshToken: string) {
    // Try revoke provided RT
    const all = await this.refreshRepo.find({ order: { created_at: 'DESC' } });
    for (const row of all) {
      if (!row.revoked_at && await argon2.verify(row.token_hash, refreshToken)) {
        row.revoked_at = new Date();
        await this.refreshRepo.save(row);
        await this.expireSessionsByHash(row.token_hash);
        return { message: 'Logout efetuado' };
      }
    }
    // Silent success to avoid token fishing
    return { message: 'Logout efetuado' };
  }
}
