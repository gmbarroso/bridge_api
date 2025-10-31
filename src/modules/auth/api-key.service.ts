import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKey } from '../../database/entities/api-key.entity';

export interface ApiKeyValidationResult {
  isValid: boolean;
  organizationId?: number;
  apiKey?: ApiKey;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey) {
      return { isValid: false };
    }

    const keyHash = this.hashApiKey(apiKey);
    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: {
        key_hash: keyHash,
        revoked_at: IsNull(),
      },
    });

    if (!apiKeyEntity) {
      return { isValid: false };
    }

    await this.apiKeyRepository.update(apiKeyEntity.id, {
      last_used_at: new Date(),
    });

    return {
      isValid: true,
      organizationId: apiKeyEntity.organization_id,
      apiKey: apiKeyEntity,
    };
  }

  async getHmacSecret(apiKey: string): Promise<string | null> {
    const keyHash = this.hashApiKey(apiKey);
    
    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: {
        key_hash: keyHash,
        revoked_at: IsNull(),
      },
    });

    return apiKeyEntity?.hmac_secret || null;
  }

  async createApiKey(
    organizationId: number,
    name?: string,
  ): Promise<{ apiKey: string; keyHash: string; hmacSecret: string }> {
    const apiKey = this.generateApiKey(organizationId);
    const keyHash = this.hashApiKey(apiKey);
    const hmacSecret = this.generateHmacSecret(organizationId);

    const apiKeyEntity = this.apiKeyRepository.create({
      organization_id: organizationId,
      key_hash: keyHash,
      hmac_secret: hmacSecret,
      name: name || `API Key ${new Date().toISOString()}`,
      permissions: {},
    });

    await this.apiKeyRepository.save(apiKeyEntity);

    return { apiKey, keyHash, hmacSecret };
  }

  private generateApiKey(organizationId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `bridge_${organizationId}_${timestamp}_${random}`;
  }

  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private generateHmacSecret(organizationId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const baseSecret = `bridge_hmac_${organizationId}_${timestamp}_${random}`;
    return createHash('sha256').update(baseSecret).digest('hex');
  }

  async getApiKeysByOrganization(organizationId: number): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async revokeApiKey(publicId: string, organizationId: number): Promise<void> {
    const result = await this.apiKeyRepository.update(
      { public_id: publicId, organization_id: organizationId },
      { revoked_at: new Date() },
    );

    if (result.affected === 0) {
      throw new UnauthorizedException('API Key not found');
    }
  }
}
