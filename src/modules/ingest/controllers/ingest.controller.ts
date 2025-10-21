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
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { HmacGuard } from '../guards/hmac.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { IngestService } from '../services/ingest.service';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { LeadAttributeDto } from '../dto/lead-attribute.dto';
import { MessageDto } from '../dto/message.dto';

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
    description: 'Adds or updates a key-value attribute for a lead. Complements lead data as flow progresses.',
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
}