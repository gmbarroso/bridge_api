import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiTags, ApiOperation, ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponse } from '../../../common/swagger/errors';
import { ApiKeyManagementService, ApiKeyInfo, ApiKeyGeneration } from '../services/api-key-management.service';
import { ApiKeyGenerationResponse, ApiKeyInfoResponse, ApiKeyUsageResponse, MessageResponse } from '../../../common/swagger/success';

class GenerateApiKeyDto {
  name: string;
  organization_id: number;
}

class RotateApiKeyDto {
  new_name?: string;
}

@ApiTags('API Key Management')
@ApiExtraModels(ErrorResponse, ApiKeyGenerationResponse, ApiKeyInfoResponse, ApiKeyUsageResponse, MessageResponse)
@Controller('admin/api-keys')
export class ApiKeyManagementController {
  constructor(
    private readonly apiKeyManagementService: ApiKeyManagementService,
  ) {}

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Listar API Keys de uma organização' })
  @ApiParam({ name: 'organizationId', type: Number, description: 'ID da organização' })
  @ApiResponse({ status: 200, description: 'Lista de API Keys (sem expor as keys)', schema: { type: 'array', items: { $ref: getSchemaPath(ApiKeyInfoResponse) } } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'Organization não encontrada', schema: { $ref: getSchemaPath(ErrorResponse) } })
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
  @ApiBody({ schema: { example: { organization_id: 1, name: 'Nova API Key - Postman' } } })
  @ApiResponse({ status: 201, description: 'API Key gerada com sucesso', schema: { $ref: getSchemaPath(ApiKeyGenerationResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
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
  @ApiParam({ name: 'publicId', description: 'UUID público da API Key a ser rotacionada' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'ID da organização' })
  @ApiBody({ schema: { example: { new_name: 'API Key Rotacionada - Prod' } } })
  @ApiResponse({ status: 200, description: 'API Key rotacionada com sucesso', schema: { $ref: getSchemaPath(ApiKeyGenerationResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'API Key não encontrada', schema: { $ref: getSchemaPath(ErrorResponse) } })
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
  @ApiParam({ name: 'publicId', description: 'UUID público da API Key a ser revogada' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'ID da organização' })
  @ApiResponse({ status: 200, description: 'API Key revogada com sucesso', schema: { $ref: getSchemaPath(MessageResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'API Key não encontrada', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async revokeApiKey(
    @Param('publicId') publicId: string,
    @Query('organizationId') organizationId: number
  ): Promise<{ message: string }> {
    await this.apiKeyManagementService.revokeApiKey(publicId, organizationId);
    return { message: 'API Key revogada com sucesso' };
  }

  @Get('organization/:organizationId/usage')
  @ApiOperation({ summary: 'Estatísticas de uso das API Keys' })
  @ApiParam({ name: 'organizationId', type: Number, description: 'ID da organização' })
  @ApiResponse({ status: 200, description: 'Estatísticas de uso', schema: { $ref: getSchemaPath(ApiKeyUsageResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'Organization não encontrada', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async getUsageStats(
    @Param('organizationId') organizationId: number
  ) {
    return this.apiKeyManagementService.getUsageStats(organizationId);
  }
}