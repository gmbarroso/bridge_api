import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../../modules/ingest/guards/api-key.guard';

export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.organizationId;
  },
);

export const ApiKeyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.apiKeyId;
  },
);