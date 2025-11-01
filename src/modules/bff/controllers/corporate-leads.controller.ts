import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { CorporateLeadsService } from '../services/corporate-leads.service';
import { ListLeadsQueryDto } from '../dto/leads.dto';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BffCorporateLeadListResponse } from '../../../common/swagger/success';
import { ErrorResponse } from '../../../common/swagger/errors';
import { createHash } from 'crypto';

@ApiTags('BFF - Corporate Leads')
@ApiBearerAuth('BearerAuth')
@Controller('bff/corporate-leads')
@UseGuards(JwtAuthGuard)
export class CorporateLeadsController {
  constructor(private readonly service: CorporateLeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista corporate leads (kind = corporate) da organização' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtro por stage' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por empresa/telefone/session_id' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens (1-200, padrão 50)' })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET com ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffCorporateLeadListResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async list(
    @OrganizationId() orgId: number,
    @Query() query: ListLeadsQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.service.list(orgId, query);

    const fingerprint = JSON.stringify({
      orgId,
      stage: query.stage ?? null,
      search: query.search ?? null,
      limit: query.limit ?? 50,
      items: result.items.map((item) => ({
        sessionId: item.sessionId,
        companyName: item.companyName,
        email: item.email,
        phone: item.phone,
        stage: item.stage,
        lastMessageAt: item.lastMessageAt,
        colaboradores: item.colaboradores,
        tipoCliente: item.tipoCliente,
        cargo: item.cargo,
        empresa: item.empresa,
        nomeAgendado: item.nomeAgendado,
        cpfCnpj: item.cpfCnpj,
      })),
    });
    const etag = 'W/"' + createHash('sha1').update(fingerprint).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, must-revalidate');
    res.status(200).json(result);
  }
}
