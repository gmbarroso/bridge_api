import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { HmacGuard } from '../guards/hmac.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { IngestService } from '../services/ingest.service';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { LeadAttributeDto } from '../dto/lead-attribute.dto';
import { MessageDto } from '../dto/message.dto';
import { LeadServiceDto } from '../dto/lead-service.dto';

@Controller('ingest')
@ApiTags('Ingest')
@UseGuards(RateLimitGuard, ApiKeyGuard, HmacGuard)
@ApiHeader({
  name: 'x-api-key',
  description: 'Organization API Key',
  required: true,
})
@ApiHeader({
  name: 'x-timestamp',
  description: 'Request timestamp (ISO 8601) - required when HMAC is enabled',
  required: false,
})
@ApiHeader({
  name: 'x-signature',
  description: 'HMAC SHA256 signature - required when HMAC is enabled',
  required: false,
})
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly ingestService: IngestService) {}

  @Post('lead-upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or find lead',
    description: 'Creates a new lead or finds existing one by phone/conversation. Lead appears immediately in dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lead created or found successfully',
    type: LeadUpsertResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid API Key or HMAC signature',
  })
  async upsertLead(
    @OrganizationId() organizationId: number,
    @Body() dto: LeadUpsertDto,
  ): Promise<LeadUpsertResponseDto> {
    this.logger.log(
      `Upserting lead for org ${organizationId}, phone: ${dto.phone}`,
    );

    return this.ingestService.upsertLead(organizationId, dto);
  }

  @Post('lead-attribute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add lead attribute',
    description: 'Adds or updates a key-value attribute for a lead. For service-related keys (servico_desejado, servico_interesse, service, service_slug), the request is routed internally to the new relational services endpoint; prefer POST /ingest/lead-service for new integrations.',
  })
  @ApiResponse({
    status: 204,
    description: 'Attribute added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid API Key or HMAC signature',
  })
  async addLeadAttribute(
    @OrganizationId() organizationId: number,
    @Body() dto: LeadAttributeDto,
  ): Promise<void> {
    this.logger.log(
      `Adding attribute ${dto.key} for org ${organizationId}, lead: ${dto.lead_public_id || dto.lead_id}`,
    );

    await this.ingestService.addLeadAttribute(organizationId, dto);
  }

  @Post('message')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add message',
    description: 'Records a message (in/out) and updates conversation timestamps. Maintains last_message_at and first_response_at.',
  })
  @ApiResponse({
    status: 204,
    description: 'Message recorded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lead not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid API Key or HMAC signature',
  })
  async addMessage(
    @OrganizationId() organizationId: number,
    @Body() dto: MessageDto,
  ): Promise<void> {
    this.logger.log(
      `Adding ${dto.direction} message (${dto.type}) for org ${organizationId}, lead: ${dto.lead_public_id || dto.lead_id}`,
    );

    await this.ingestService.addMessage(organizationId, dto);
  }

  @Post('lead-service')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vincular serviço ao lead', description: 'Cria/atualiza relação Lead↔Service (desired/interested/purchased/recommended).' })
  @ApiResponse({ status: 204, description: 'Vínculo criado/atualizado' })
  @ApiResponse({ status: 404, description: 'Lead ou serviço não encontrado' })
  @ApiResponse({ status: 401, description: 'Invalid API Key or HMAC signature' })
  @ApiBody({
    required: true,
    description: 'Identifique o lead por UUID (preferido) ou ID, e o serviço por slug (preferido), public_id ou title. Relation default: desired.',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            lead_public_id: { type: 'string', format: 'uuid' },
            service_slug: { type: 'string' },
            relation: { type: 'string', enum: ['interested','desired','purchased','recommended'], default: 'desired' },
            source: { type: 'string' },
          },
          required: ['lead_public_id','service_slug']
        },
        {
          type: 'object',
          properties: {
            lead_id: { type: 'integer' },
            service_public_id: { type: 'string', format: 'uuid' },
            relation: { type: 'string', enum: ['interested','desired','purchased','recommended'], default: 'desired' },
            source: { type: 'string' },
          },
          required: ['lead_id','service_public_id']
        }
      ],
      examples: {
        bySlug: {
          summary: 'Vincular por lead_public_id + service_slug',
          value: { lead_public_id: '00000000-0000-4000-8000-000000000000', service_slug: 'corte-feminino', relation: 'interested', source: 'bot_whatsapp' },
        },
        byPublicIds: {
          summary: 'Vincular por IDs públicos',
          value: { lead_id: 123, service_public_id: '11111111-1111-4111-8111-111111111111', relation: 'desired' },
        },
      },
    },
  })
  async addLeadService(
    @OrganizationId() organizationId: number,
    @Body() dto: LeadServiceDto,
  ): Promise<void> {
    await this.ingestService.addLeadService(organizationId, dto);
  }
}