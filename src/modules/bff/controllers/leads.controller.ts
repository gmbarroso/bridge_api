import { Controller, Get, Param, Query, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { CursorDto, ListLeadsDto } from '../dto/leads.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse, ApiQuery, ApiHeader, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponse } from '../../../common/swagger/errors';
import { BffLeadListResponse, BffLeadDetailResponse, BffTimelineResponse } from '../../../common/swagger/success';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';

@ApiTags('BFF - Leads')
@ApiBearerAuth('BearerAuth')
@Controller('bff/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de leads (paginado por cursor)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor opaco para paginação' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (1-100, padrão 20)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filtro de data inicial (inclusive, UTC)', schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filtro de data final (exclusivo, UTC)', schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'q', required: false, description: 'Busca por nome/telefone' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtro por estágio' })
  @ApiQuery({ name: 'source', required: false, description: 'Filtro por origem (whatsapp, instagram, ...)' })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET usando ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadListResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde ao conteúdo atual)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async list(
    @OrganizationId() orgId: number,
    @Query() query: ListLeadsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.leads.list(orgId, query);

    // Gera ETag a partir do conteúdo e dos parâmetros relevantes
    const fingerprint = JSON.stringify({
      orgId,
      q: query.q || null,
      stage: query.stage || null,
      source: query.source || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null,
      cursor: query.cursor || null,
      limit: query.limit || 20,
      items: result.items.map((i) => ({
        id: i.id,
        createdAt: i.createdAt,
        lastMessageAt: i.lastMessageAt,
        stage: i.stage,
        servico_desejado: i.servico_desejado ?? null,
      })),
      nextCursor: result.nextCursor || null,
    });
    const etag = 'W/"' + createHash('sha1').update(fingerprint).digest('hex') + '"';

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, must-revalidate');
    res.status(200).json(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do lead por public_id' })
  @ApiParam({ name: 'id', description: 'Lead public_id (UUID)', example: 'f1b0b0d1-0000-4000-8000-000000000000' })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET usando ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffLeadDetailResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde ao conteúdo atual)' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async getDetail(
    @OrganizationId() orgId: number,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const detail = await this.leads.detail(orgId, id);
    if (!detail) throw new NotFoundException('Lead not found');
    const fingerprint = JSON.stringify({ orgId, id, detail });
    const etag = 'W/"' + createHash('sha1').update(fingerprint).digest('hex') + '"';
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, must-revalidate');
    res.status(200).json(detail);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Timeline do lead (mensagens)' })
  @ApiParam({ name: 'id', description: 'Lead public_id (UUID)', example: 'f1b0b0d1-0000-4000-8000-000000000000' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor opaco para paginação' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (1-100, padrão 20)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET usando ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffTimelineResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde ao conteúdo atual)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async getTimeline(
    @OrganizationId() orgId: number,
    @Param('id') id: string,
    @Query() query: CursorDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.leads.timeline(orgId, id, query);
    const fingerprint = JSON.stringify({ orgId, id, cursor: query.cursor || null, limit: query.limit || 20, items: result.items.map(i => ({ id: i.id, createdAt: i.createdAt, direction: i.direction, type: i.type })), nextCursor: result.nextCursor || null });
    const etag = 'W/"' + createHash('sha1').update(fingerprint).digest('hex') + '"';
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, must-revalidate');
    res.status(200).json(result);
  }
}
