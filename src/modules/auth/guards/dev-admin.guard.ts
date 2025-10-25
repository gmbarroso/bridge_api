import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

export interface AdminRequest extends Request {
  organizationId: number;
  userId?: number;
}

@Injectable()
export class DevAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();

    const orgHeader = (req.headers['x-organization-id'] as string) || (req.headers['X-Organization-Id'] as string);
    if (!orgHeader) {
      throw new UnauthorizedException('Missing auth (JWT) or x-organization-id');
    }
    const orgId = Number(orgHeader);
    if (!orgId || Number.isNaN(orgId)) {
      throw new UnauthorizedException('Invalid organization id');
    }
    req.organizationId = orgId;

    const isAdmin = String(req.headers['x-admin'] || '').toLowerCase() === 'true';
    if (!isAdmin) {
      throw new ForbiddenException('Admin required (dev header x-admin=true)');
    }

    return true;
  }
}
