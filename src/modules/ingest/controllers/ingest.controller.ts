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
import { MessageDto } from '../dto/message.dto';
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
    description: 'Data for creating or updating a lead (person) or corporate lead. Identified uniquely by session_id.',
    examples: {
      basic: {
        summary: 'Lead (person) creation',
        value: {
          session_id: 'session-01HZY9Q3CH9R9',
          conversation_id: 'session-01HZY9Q3CH9R9',
          phone: '+5521999999999',
          name: 'John Doe',
          email: 'john.doe@example.com',
          source: 'whatsapp',
          app: 'evolution',
        },
      },
      corporate: {
        summary: 'Corporate lead creation',
        value: {
          session_id: 'corp-session-123',
          kind: 'corporate',
          company_name: 'Bridge Tecnologia',
          email: 'contato@bridge.inc',
          source: 'whatsapp',
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

  @Post('message')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add message',
    description: 'Records a message (in/out) linked by session/conversation id and updates conversation timestamps.',
  })
  @ApiBody({
    type: MessageDto,
    description: 'Message payload identified by session_id/conversation_id. Payload is persisted as text JSON.',
    examples: {
      inboundText: {
        summary: 'Inbound text (WhatsApp)',
        value: {
          session_id: 'session-01HZY9Q3CH9R9',
          direction: 'in',
          type: 'text',
          payload: { text: 'Olá!' },
          channel: 'whatsapp',
          app: 'evolution',
        },
      },
      outboundReply: {
        summary: 'Outbound reply',
        value: {
          conversation_id: 'session-01HZY9Q3CH9R9',
          direction: 'out',
          type: 'text',
          payload: { text: 'Podemos marcar às 15h.' },
          channel: 'whatsapp',
          app: 'evolution',
        },
      },
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
}
