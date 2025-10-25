import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export interface FrontRequest extends Request {
  organizationId: number;
  suborganizationId?: number;
  userId?: number;
}

@Injectable()
export class FrontAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FrontRequest>();

    // TODO: Implement JWT validation (Access token) and derive org/suborg from users table.
    // Dev fallback: allow x-organization-id (DO NOT USE IN PROD)
    const orgHeader = (req.headers['x-organization-id'] as string) || (req.headers['X-Organization-Id'] as string);
    if (!orgHeader) {
      throw new UnauthorizedException('Missing auth (JWT) or x-organization-id');
    }
    const orgId = Number(orgHeader);
    if (!orgId || Number.isNaN(orgId)) {
      throw new UnauthorizedException('Invalid organization id');
    }
    req.organizationId = orgId;

    const subHeader = (req.headers['x-suborganization-id'] as string) || (req.headers['X-Suborganization-Id'] as string);
    if (subHeader && !Number.isNaN(Number(subHeader))) {
      req.suborganizationId = Number(subHeader);
    }

    return true;
  }
}
