import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

type RequestWithOrgContext = Request & {
  organizationId?: number;
  apiKeyId?: number;
};

export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrgContext>();
    if (typeof request.organizationId !== 'number') {
      throw new UnauthorizedException('Organização não encontrada no contexto da requisição');
    }
    return request.organizationId;
  },
);

export const ApiKeyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrgContext>();
    return request.apiKeyId;
  },
);
