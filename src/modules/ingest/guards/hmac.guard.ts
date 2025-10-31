import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { ApiKeyService } from '../../auth/api-key.service';

@Injectable()
export class HmacGuard implements CanActivate {
  private readonly hmacEnabled: boolean;
  private readonly timeWindow: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyService: ApiKeyService,
  ) {
    this.hmacEnabled = this.configService.get<boolean>('security.hmacEnabled', false);
    this.timeWindow = this.configService.get<number>('security.hmacTimeWindow', 300);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Se HMAC não estiver habilitado, passa direto
    if (!this.hmacEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    
    const timestamp = request.headers['x-timestamp'] as string;
    const signature = request.headers['x-signature'] as string;

    if (!timestamp || !signature) {
      throw new UnauthorizedException('HMAC headers are required when HMAC is enabled');
    }

    // Validar timestamp (janela de tempo)
    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - requestTime) / 1000; // em segundos

    if (timeDiff > this.timeWindow) {
      throw new UnauthorizedException('Request timestamp outside allowed time window');
    }

    // Validar assinatura HMAC
    const isValid = await this.validateHmacSignature(request, timestamp, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }

  private async validateHmacSignature(
    request: Request,
    timestamp: string,
    providedSignature: string,
  ): Promise<boolean> {
    // Obter API Key do header
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      return false;
    }

    // Obter secret específico da organização
    const secret = await this.apiKeyService.getHmacSecret(apiKey);
    if (!secret) {
      return false;
    }

    // Obter o corpo da requisição como string
    const rawBody = JSON.stringify(request.body);
    
    // Criar a mensagem para assinatura: timestamp + '.' + rawBody
    const message = timestamp + '.' + rawBody;
    
    // Calcular HMAC SHA256
    const expectedSignature = createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    // Comparação segura de strings
    return this.safeStringCompare(providedSignature, expectedSignature);
  }

  private safeStringCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
