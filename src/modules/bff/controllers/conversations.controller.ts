import { Controller, Get, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiOkResponse, ApiQuery, ApiHeader, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponse } from '../../../common/swagger/errors';
import { BffTimelineResponse } from '../../../common/swagger/success';
import { ChatsService } from '../services/chats.service';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';

@ApiTags('BFF - Conversations')
@ApiBearerAuth('BearerAuth')
@Controller('bff/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly chats: ChatsService) {}

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lista mensagens da conversa por public_id' })
  @ApiParam({ name: 'id', description: 'Conversation public_id (UUID)', example: 'c1b0b0d1-0000-4000-8000-000000000000' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de mensagens retornadas (padrão 100)', schema: { type: 'integer', minimum: 1, maximum: 200, default: 100 } })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'Conditional GET usando ETag' })
  @ApiOkResponse({ schema: { $ref: getSchemaPath(BffTimelineResponse) } })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag corresponde ao conteúdo atual)' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async listMessages(
    @OrganizationId() orgId: number,
    @Param('id') id: string,
    @Query('limit') limit = 100,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const numericLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const result = await this.chats.conversationMessages(orgId, id, numericLimit);
    const fingerprint = JSON.stringify({
      orgId,
      id,
      limit: numericLimit,
      items: result.items.map((i) => ({
        id: i.id,
        createdAt: i.createdAt,
        direction: i.direction,
        type: i.type,
      })),
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
}
