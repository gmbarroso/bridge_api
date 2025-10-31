import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../../auth/api-key.service';

export interface AuthenticatedRequest extends Request {
  organizationId: number;
  apiKeyId?: number;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key is required');
    }

    const validationResult = await this.apiKeyService.validateApiKey(apiKey);

    if (!validationResult.isValid) {
      throw new UnauthorizedException('Invalid API Key');
    }

    // Adicionar dados da organização à requisição
    request.organizationId = validationResult.organizationId!;
    request.apiKeyId = validationResult.apiKey!.id;

    return true;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    // Suporta tanto 'x-api-key' quanto 'X-API-Key'
    return (
      request.headers['x-api-key'] as string ||
      request.headers['X-API-Key'] as string
    );
  }
}
