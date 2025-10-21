import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../../auth/api-key.service';

export interface AuthenticatedRequest extends Request {
  organizationId: number;
  apiKeyId?: number;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      this.logger.warn('Missing API Key in request headers');
      throw new UnauthorizedException('API Key is required');
    }

    const validationResult = await this.apiKeyService.validateApiKey(apiKey);

    if (!validationResult.isValid) {
      this.logger.warn(`Invalid API Key: ${apiKey.substring(0, 10)}...`);
      throw new UnauthorizedException('Invalid API Key');
    }

    // Adicionar dados da organização à requisição
    request.organizationId = validationResult.organizationId!;
    request.apiKeyId = validationResult.apiKey!.id;

    this.logger.log(
      `API Key validated for organization: ${validationResult.organizationId}`,
    );

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