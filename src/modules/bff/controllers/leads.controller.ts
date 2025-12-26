import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { LeadsService } from '../services/leads.service';
import { ListLeadsQueryDto, UpdateLeadDto, CreateLeadDto } from '../dto/leads.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiHeader, getSchemaPath, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BffLeadListItem, BffLeadListResponse } from '../../../common/swagger/success';
import { ErrorResponse } from '../../../common/swagger/errors';
import { createHash } from 'crypto';

@ApiTags('BFF - Leads')
@ApiBearerAuth('BearerAuth')
@Controller('bff/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  private sendCachedResponse(
    orgId: number,
    query: ListLeadsQueryDto,
    req: Request,
    res: Response,
    result: BffLeadListResponse,
    cacheKey: string,
  ) {
    const fingerprint = JSON.stringify({
      cacheKey,
      orgId,
      stage: query.stage ?? null,
      search: query.search ?? null,
      limit: query.limit ?? 50,
      cursor: query.cursor ?? null,
      items: result.items.map((item) => ({
        sessionId: item.sessionId,
        kind: item.kind,
        name: item.name,
        companyName: item.companyName,
        email: item.email,
        phone: item.phone,
        stage: item.stage,
        lastMessageAt: item.lastMessageAt,
        servico: item.servico,
        pushName: item.pushName,
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

  @Get()
  @ApiOperation({ summary: 'Lista leads da organização (baseado em session_id)' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtro por stage' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome/telefone/session_id' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens (1-200, padrão 50)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor de paginação opaco' })
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

    this.sendCachedResponse(orgId, query, req, res, result, 'person');
  }

  @Get('all')
  @ApiOperation({ summary: 'Lista todos os leads (PF e PJ) da organização' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtro por stage' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome/telefone/session_id/company' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de itens (1-200, padrão 50)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor de paginação opaco' })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET com ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadListResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async listAll(
    @OrganizationId() orgId: number,
    @Query() query: ListLeadsQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.leadsService.listAll(orgId, query);
    this.sendCachedResponse(orgId, query, req, res, result, 'all');
  }

  @Post()
  @ApiOperation({ summary: 'Atualiza dados de um lead' })
  @ApiBody({ schema: { $ref: getSchemaPath(UpdateLeadDto) } })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadListItem) } })
  @ApiResponse({ status: 400, description: 'Payload inválido', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 404, description: 'Lead não encontrado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async update(
    @OrganizationId() orgId: number,
    @Body() body: UpdateLeadDto,
  ) {
    return this.leadsService.update(orgId, body);
  }

  @Post('create')
  @ApiOperation({ summary: 'Cria um novo lead manualmente' })
  @ApiBody({ schema: { $ref: getSchemaPath(CreateLeadDto) } })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadListItem) } })
  @ApiResponse({ status: 400, description: 'Payload inválido', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async create(
    @OrganizationId() orgId: number,
    @Body() body: CreateLeadDto,
  ) {
    return this.leadsService.create(orgId, body);
  }
}
