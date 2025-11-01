import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

export interface JwtUserRequest extends Request {
  organizationId: number;
  suborganizationId?: number | null;
  userId: number;
  role: 'viewer' | 'agent' | 'manager' | 'admin';
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
    return secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<JwtUserRequest>();
    const auth = req.headers['authorization'] || req.headers['Authorization'] as string | undefined;
    if (!auth || !auth.toString().startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = auth.toString().slice('Bearer '.length);

    let decoded: any;
    try {
      decoded = verify(token, this.getAccessSecret());
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!decoded || !decoded.sub || !decoded.orgId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.userRepo.findOne({ where: { id: decoded.sub } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (!user.organization_id) {
      throw new UnauthorizedException('Usuário sem organização');
    }

    if (user.organization_id !== decoded.orgId) {
      throw new UnauthorizedException('Organização divergente, faça login novamente');
    }

    req.userId = user.id;
    req.organizationId = user.organization_id;
    req.suborganizationId = user.sub_organization_id ?? null;
    req.email = user.email;
    req.role = user.role;

    return true;
  }
}
