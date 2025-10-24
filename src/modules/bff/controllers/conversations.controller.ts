import { Controller, Get, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse, ApiQuery, ApiHeader, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponse } from '../../../common/swagger/errors';
import { BffTimelineResponse } from '../../../common/swagger/success';
import { LeadsService } from '../services/leads.service';
import { CursorDto } from '../dto/leads.dto';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';

@ApiTags('BFF - Conversations')
@ApiBearerAuth('BearerAuth')
@Controller('bff/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly leads: LeadsService) {}

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lista mensagens da conversa por public_id' })
  @ApiParam({ name: 'id', description: 'Conversation public_id (UUID)', example: 'c1b0b0d1-0000-4000-8000-000000000000' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor opaco para paginação' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (1-100, padrão 20)', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET usando ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffTimelineResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde ao conteúdo atual)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async listMessages(
    @OrganizationId() orgId: number,
    @Param('id') id: string,
    @Query() query: CursorDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.leads.conversationMessages(orgId, id, query);
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
