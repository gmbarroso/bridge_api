import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKey } from '../../../database/entities/api-key.entity';

export interface ApiKeyInfo {
  public_id: string;
  name: string;
  suffix: string;
  status: string;
  last_used_at: Date | null;
  created_at: Date;
  organization_id: number;
}

export interface ApiKeyGeneration {
  apiKey: string;
  public_id: string;
  organization_id: number;
  hmac_secret: string;
}

@Injectable()
export class ApiKeyManagementService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Lista API Keys de uma organização (sem expor as keys)
   */
  async listApiKeys(organizationId: number): Promise<ApiKeyInfo[]> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });

    return apiKeys.map(key => ({
      public_id: key.public_id,
      name: key.name || 'Unnamed Key',
      suffix: this.generateDisplaySuffix(key.key_hash),
      status: key.status,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
      organization_id: key.organization_id,
    }));
  }

  /**
   * Gera nova API Key (única vez que a key é vista)
   */
  async generateApiKey(
    organizationId: number, 
    name: string = 'Generated Key'
  ): Promise<ApiKeyGeneration> {
    const timestamp = Date.now();
    const apiKey = `bridge_${organizationId}_${timestamp}_${this.generateSuffix()}`;
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const hmacSecret = `bridge_hmac_${organizationId}_${timestamp}_${this.generateSuffix()}`;

    const newApiKey = await this.apiKeyRepository.save({
      organization_id: organizationId,
      key_hash: keyHash,
      name,
      status: 'active',
      hmac_secret: hmacSecret,
    });

    return {
      apiKey,
      public_id: newApiKey.public_id,
      organization_id: organizationId,
      hmac_secret: hmacSecret,
    };
  }

  /**
   * Revoga API Key (para casos de comprometimento)
   */
  async revokeApiKey(publicId: string, organizationId: number): Promise<void> {
    await this.apiKeyRepository.update(
      { 
        public_id: publicId, 
        organization_id: organizationId 
      },
      { 
        status: 'revoked',
        updated_at: new Date(),
        rotated_at: new Date()
      }
    );
  }

  /**
   * Rotaciona API Key (cria nova, revoga antiga)
   */
  async rotateApiKey(
    publicId: string, 
    organizationId: number,
    newName?: string
  ): Promise<ApiKeyGeneration> {
    // Busca a key atual
    const currentKey = await this.apiKeyRepository.findOne({
      where: { public_id: publicId, organization_id: organizationId }
    });

    if (!currentKey) {
      throw new Error('API Key not found');
    }

    // Gera nova key
    const newKey = await this.generateApiKey(
      organizationId, 
      newName || currentKey.name || 'Rotated Key'
    );

    // Revoga a antiga
    await this.revokeApiKey(publicId, organizationId);

    return newKey;
  }

  /**
   * Verifica última utilização (para auditoria)
   */
  async getUsageStats(organizationId: number) {
    return await this.apiKeyRepository
      .createQueryBuilder('ak')
      .select([
        'ak.public_id',
        'ak.name',
        'ak.status',
        'ak.last_used_at',
        'ak.created_at',
        'COUNT(CASE WHEN ak.last_used_at > NOW() - INTERVAL \'24 hours\' THEN 1 END) as usage_24h'
      ])
      .where('ak.organization_id = :organizationId', { organizationId })
      .groupBy('ak.id')
      .getRawMany();
  }

  /**
   * Busca API Key que está causando problemas (por hash parcial)
   */
  async findApiKeyByPartialHash(partialHash: string, organizationId: number) {
    const keys = await this.apiKeyRepository.find({
      where: { organization_id: organizationId }
    });

    return keys.find(key => 
      key.key_hash.startsWith(partialHash) || 
      key.key_hash.endsWith(partialHash)
    );
  }

  private generateSuffix(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  private generateDisplaySuffix(keyHash: string): string {
    // Mostra apenas os últimos 8 caracteres do hash
    return `...${keyHash.slice(-8)}`;
  }
}