import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { VerificationToken } from '../../database/entities/verification-token.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(VerificationToken)
    private readonly tokenRepo: Repository<VerificationToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  async acceptInvite(params: { token: string; name: string; password: string }) {
    const { token, name, password } = params;
    const tokenHash = this.hashToken(token);

    const vt = await this.tokenRepo.findOne({ where: { token_hash: tokenHash } });
    if (!vt) throw new BadRequestException('Convite inválido');
    if (vt.type !== 'invite') throw new BadRequestException('Tipo de token inválido');
    if (vt.used_at) throw new BadRequestException('Convite já utilizado');
    if (vt.expires_at < new Date()) throw new BadRequestException('Convite expirado');
    if (!vt.organization_id || !vt.invite_email || !vt.invite_role) {
      throw new BadRequestException('Convite malformado');
    }

    // Criar usuário na organização do convite
    const password_algo = 'argon2id';
    const password_hash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await this.userRepo.save({
      email: vt.invite_email,
      name,
      password_hash,
      password_algo,
      password_salt: '',
      email_verified_at: new Date(), // aceitar convite já verifica email
      organization_id: vt.organization_id,
      suborganization_id: null,
      role: vt.invite_role,
    });

    // Marcar token como usado e vincular ao novo usuário
    vt.used_at = new Date();
    vt.user_id = user.id;
    await this.tokenRepo.save(vt);

    return {
      message: 'Convite aceito com sucesso',
      user: {
        id: user.id,
        public_id: user.public_id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
      },
    };
  }
}
