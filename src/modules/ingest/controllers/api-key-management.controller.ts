import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiKeyManagementService, ApiKeyInfo, ApiKeyGeneration } from '../services/api-key-management.service';

class GenerateApiKeyDto {
  name: string;
  organization_id: number;
}

class RotateApiKeyDto {
  new_name?: string;
}

@ApiTags('API Key Management')
@Controller('admin/api-keys')
export class ApiKeyManagementController {
  constructor(
    private readonly apiKeyManagementService: ApiKeyManagementService,
  ) {}

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Listar API Keys de uma organização' })
  @ApiResponse({ status: 200, description: 'Lista de API Keys (sem expor as keys)' })
  async listApiKeys(
    @Param('organizationId') organizationId: number
  ): Promise<ApiKeyInfo[]> {
    return this.apiKeyManagementService.listApiKeys(organizationId);
  }

  @Post('generate')
  @ApiOperation({ 
    summary: 'Gerar nova API Key',
    description: '⚠️ A API Key só é mostrada UMA VEZ! Salve imediatamente.'
  })
  @ApiResponse({ status: 201, description: 'API Key gerada com sucesso' })
  async generateApiKey(
    @Body() dto: GenerateApiKeyDto
  ): Promise<ApiKeyGeneration> {
    return this.apiKeyManagementService.generateApiKey(
      dto.organization_id, 
      dto.name
    );
  }

  @Post(':publicId/rotate')
  @ApiOperation({ 
    summary: 'Rotacionar API Key',
    description: 'Cria nova key e revoga a antiga. A nova key só é mostrada UMA VEZ!'
  })
  @ApiResponse({ status: 200, description: 'API Key rotacionada com sucesso' })
  async rotateApiKey(
    @Param('publicId') publicId: string,
    @Query('organizationId') organizationId: number,
    @Body() dto: RotateApiKeyDto
  ): Promise<ApiKeyGeneration> {
    return this.apiKeyManagementService.rotateApiKey(
      publicId, 
      organizationId, 
      dto.new_name
    );
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Revogar API Key' })
  @ApiResponse({ status: 200, description: 'API Key revogada com sucesso' })
  async revokeApiKey(
    @Param('publicId') publicId: string,
    @Query('organizationId') organizationId: number
  ): Promise<{ message: string }> {
    await this.apiKeyManagementService.revokeApiKey(publicId, organizationId);
    return { message: 'API Key revogada com sucesso' };
  }

  @Get('organization/:organizationId/usage')
  @ApiOperation({ summary: 'Estatísticas de uso das API Keys' })
  @ApiResponse({ status: 200, description: 'Estatísticas de uso' })
  async getUsageStats(
    @Param('organizationId') organizationId: number
  ) {
    return this.apiKeyManagementService.getUsageStats(organizationId);
  }
}