import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { HmacGuard } from '../guards/hmac.guard';
import { IngestService } from '../services/ingest.service';
import { CursorDto } from '../dto/cursor.dto';
import { ErrorResponse } from '../../../common/swagger/errors';
import { BffServiceHistoryResponse } from '../../../common/swagger/success';

@ApiTags('API - Leads (M2M)')
@ApiSecurity('apiKey')
@UseGuards(RateLimitGuard, ApiKeyGuard, HmacGuard)
@ApiHeader({ name: 'x-api-key', description: 'Organization API Key', required: true })
@ApiHeader({ name: 'x-timestamp', description: 'Request timestamp (ISO 8601) - required when HMAC is enabled', required: false })
@ApiHeader({ name: 'x-signature', description: 'HMAC SHA256 signature - required when HMAC is enabled', required: false })
@Controller('api/leads')
export class M2MLeadsController {
  constructor(private readonly ingestService: IngestService) {}

  @Get(':id/services/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Histórico de serviços do lead (M2M, API Key)' })
  @ApiParam({ name: 'id', description: 'Lead public_id (UUID)', example: 'f1b0b0d1-0000-4000-8000-000000000000' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor opaco para paginação (base64 ts|id)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (1-100, padrão 20)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })
  @ApiQuery({ name: 'relation', required: false, description: 'Filtra por relação', schema: { type: 'string', enum: ['desired','interested','purchased','recommended'] } })
  @ApiResponse({ status: 200, description: 'OK', schema: { $ref: getSchemaPath(BffServiceHistoryResponse) } })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async history(
    @OrganizationId() organizationId: number,
    @Param('id') leadPublicId: string,
    @Query() query: CursorDto,
  ) {
    const result = await this.ingestService.getLeadServiceHistory(organizationId, leadPublicId, query);
    return result;
  }

  @Get(':id/services/consumed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Serviços consumidos (purchased) do lead (M2M, API Key)' })
  @ApiParam({ name: 'id', description: 'Lead public_id (UUID)', example: 'f1b0b0d1-0000-4000-8000-000000000000' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor opaco para paginação (base64 ts|id)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (1-100, padrão 20)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })
  @ApiResponse({ status: 200, description: 'OK', schema: { $ref: getSchemaPath(BffServiceHistoryResponse) } })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async consumed(
    @OrganizationId() organizationId: number,
    @Param('id') leadPublicId: string,
    @Query() query: CursorDto,
  ) {
    const result = await this.ingestService.getLeadConsumedServices(organizationId, leadPublicId, query);
    return result;
  }
}
