import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { LeadsService } from '../services/leads.service';
import { ListLeadsQueryDto } from '../dto/leads.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiHeader, getSchemaPath } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BffLeadListResponse } from '../../../common/swagger/success';
import { ErrorResponse } from '../../../common/swagger/errors';
import { createHash } from 'crypto';

@ApiTags('BFF - Leads')
@ApiBearerAuth('BearerAuth')
@Controller('bff/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista leads da organização (baseado em session_id)' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtro por stage' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome/telefone/session_id' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens (1-200, padrão 50)' })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET com ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadListResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async list(
    @OrganizationId() orgId: number,
    @Query() query: ListLeadsQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.leadsService.list(orgId, query);

    const fingerprint = JSON.stringify({
      orgId,
      stage: query.stage ?? null,
      search: query.search ?? null,
      limit: query.limit ?? 50,
      items: result.items.map((item) => ({
        sessionId: item.sessionId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        stage: item.stage,
        lastMessageAt: item.lastMessageAt,
        servico: item.servico,
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
