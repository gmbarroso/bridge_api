import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';

export interface JwtUserRequest extends Request {
  organizationId: number;
  suborganizationId?: number | null;
  userId: number;
  role: 'viewer' | 'agent' | 'admin';
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    req.userId = decoded.sub;
    req.organizationId = decoded.orgId;
    req.suborganizationId = decoded.suborgId || null;
    req.email = decoded.email;

    return true;
  }
}
