import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { JwtAuthGuard, JwtUserRequest } from '../../auth/guards/jwt.guard';
import { IntegrationsService } from '../services/integrations.service';
import { GoogleConnectDto, IntegrationInfoDto } from '../dto/integrations.dto';

@ApiTags('BFF - Integrations')
@ApiBearerAuth('BearerAuth')
@Controller('bff/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('google')
  @ApiOperation({ summary: 'Obtém status da integração Google Calendar' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(IntegrationInfoDto) } })
  async getGoogle(@OrganizationId() orgId: number, @Req() req: JwtUserRequest) {
    const subOrgId = req.suborganizationId ?? null;
    return this.integrations.getGoogleIntegration(orgId, subOrgId);
  }

  @Post('google/connect')
  @ApiOperation({ summary: 'Conecta Google Calendar com Client ID/Secret' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(IntegrationInfoDto) } })
  async connectGoogle(
    @OrganizationId() orgId: number,
    @Req() req: JwtUserRequest,
    @Body() body: GoogleConnectDto,
  ) {
    const subOrgId = req.suborganizationId ?? null;
    return this.integrations.connectGoogleIntegration(orgId, subOrgId, body);
  }

  @Delete('google')
  @ApiOperation({ summary: 'Desconecta integração Google Calendar' })
  @ApiOkResponse({ schema: { example: { disconnected: true } } })
  async disconnectGoogle(@OrganizationId() orgId: number, @Req() req: JwtUserRequest) {
    const subOrgId = req.suborganizationId ?? null;
    return this.integrations.disconnectGoogleIntegration(orgId, subOrgId);
  }
}
