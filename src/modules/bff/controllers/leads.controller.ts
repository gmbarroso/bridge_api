import { Controller, Get, Param, Query, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { CursorDto, ListLeadsDto } from '../dto/leads.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';

@ApiTags('BFF - Leads')
@ApiBearerAuth('BearerAuth')
@Controller('bff/leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOkResponse({ schema: { example: { items: [ { id: 'f1b0...', name: 'Ana', phone: '+55 21 99999-9999', source: 'whatsapp', stage: 'new', createdAt: '2025-10-10T12:34:56.000Z', lastMessageAt: '2025-10-11T10:00:00.000Z', servico_desejado: 'corte-feminino' } ], nextCursor: null } } })
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
  @ApiOkResponse({ schema: { example: { id: 'f1b0...', name: 'Ana', phone: '+55 21 99999-9999', email: 'ana@ex.com', source: 'whatsapp', stage: 'new', createdAt: '2025-10-10T12:34:56.000Z', lastMessageAt: '2025-10-11T10:00:00.000Z', desiredService: 'corte-feminino', serviceLinks: [ { slug: 'corte-feminino', title: 'Corte Feminino', relation: 'desired', ts: '2025-10-10T12:34:56.000Z' } ], attributes: { servico_desejado: 'corte-feminino', bairro: 'Centro', plano_fidelidade: null }, totals: { conversations: 2, messages: 5 } } } })
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
