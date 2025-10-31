import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiSecurity,
  ApiBody,
  getSchemaPath,
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
import { ErrorResponse } from '../../../common/swagger/errors';

@Controller('ingest')
@ApiTags('Ingest')
@ApiSecurity('apiKey') // Apply apiKey security to all endpoints in this controller
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
  constructor(private readonly ingestService: IngestService) {}

  @Post('lead-upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or find lead',
    description: 'Creates a new lead or finds existing one by phone/conversation. Lead appears immediately in dashboard.',
  })
  @ApiBody({
    type: LeadUpsertDto,
    description: 'Data for creating or updating a lead.',
    examples: {
      basic: {
        summary: 'Basic lead creation',
        value: {
          phone: '+5521999999999',
          name: 'John Doe',
          email: 'john.doe@example.com',
          source: 'whatsapp',
          app: 'evolution-api',
          conversation_id: 'xyz-123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lead created or found successfully',
    type: LeadUpsertResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  @ApiResponse({ status: 401, description: 'Unauthorized (API Key/HMAC inválidos)', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation error.', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async upsertLead(
    @OrganizationId() organizationId: number,
    @Body() dto: LeadUpsertDto,
  ): Promise<LeadUpsertResponseDto> {
    return this.ingestService.upsertLead(organizationId, dto);
  }

  @Post('lead-attribute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add lead attribute',
          description: 'Adds or updates a key-value attribute for a lead. DEPRECATED for service-related keys: do not send services via attributes. Use POST /ingest/lead-service (this endpoint keeps a temporary compat path that routes keys servico_desejado/servico_interesse/service/service_slug to lead-service).',
  })
  @ApiBody({
    type: LeadAttributeDto,
    description: 'Lead attribute as key/value with optional source and lead identifier (public_id preferred).',
    examples: {
      byPublicId: { summary: 'By lead_public_id', value: { lead_public_id: '00000000-0000-4000-8000-000000000000', key: 'bairro', value: 'Centro', source: 'bot_whatsapp' } },
          serviceCompat: { summary: 'DEPRECATED: Service via attribute (compat path)', value: { lead_public_id: '00000000-0000-4000-8000-000000000000', key: 'servico_desejado', value: 'corte-feminino', source: 'bot_whatsapp' } },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Attribute added successfully',
  })
  @ApiResponse({ status: 404, description: 'Lead not found', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation error.', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  @ApiResponse({ status: 401, description: 'Unauthorized (API Key/HMAC inválidos)', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async addLeadAttribute(
    @OrganizationId() organizationId: number,
    @Body() dto: LeadAttributeDto,
  ): Promise<void> {
    await this.ingestService.addLeadAttribute(organizationId, dto);
  }

  @Post('message')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add message',
    description: 'Records a message (in/out) and updates conversation timestamps. Maintains last_message_at and first_response_at.',
  })
  @ApiBody({
    type: MessageDto,
    description: 'Message payload with direction, type and raw payload; identify lead by public_id (preferred) or provide conversation context.',
    examples: {
      inboundText: { summary: 'Inbound text (WhatsApp)', value: { lead_public_id: '00000000-0000-4000-8000-000000000000', direction: 'in', type: 'text', payload: { text: 'Olá!' }, channel: 'whatsapp', app: 'evolution', conversation_id: 'conv_123' } },
      outboundReply: { summary: 'Outbound reply', value: { lead_public_id: '00000000-0000-4000-8000-000000000000', direction: 'out', type: 'text', payload: { text: 'Podemos marcar às 15h.' }, channel: 'whatsapp', app: 'evolution', conversation_id: 'conv_123' } },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Message recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Lead not found', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation error.', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  @ApiResponse({ status: 401, description: 'Unauthorized (API Key/HMAC inválidos)', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async addMessage(
    @OrganizationId() organizationId: number,
    @Body() dto: MessageDto,
  ): Promise<void> {
    await this.ingestService.addMessage(organizationId, dto);
  }

  @Post('lead-service')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vincular serviço ao lead', description: 'Cria/atualiza relação Lead↔Service (desired/interested/purchased/recommended).' })
  @ApiResponse({ status: 204, description: 'Vínculo criado/atualizado' })
  @ApiResponse({ status: 404, description: 'Lead ou serviço não encontrado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation error.', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 429, description: 'Too Many Requests (rate limited)' })
  @ApiResponse({ status: 401, description: 'Unauthorized (API Key/HMAC inválidos)', schema: { $ref: getSchemaPath(ErrorResponse) } })
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
