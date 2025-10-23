import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { OrganizationId } from '../../../common/decorators/organization.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from '../services/stats.service';
import { TrendQueryDto } from '../dto/stats.dto';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';

@ApiTags('BFF - Stats')
@ApiBearerAuth('BearerAuth')
@Controller('bff/stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo rápido de leads' })
  async summary(
    @OrganizationId() orgId: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.stats.summary(orgId);
    const fingerprint = JSON.stringify({ orgId, result });
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

  @Get('leads-trend')
  @ApiOperation({ summary: 'Trend de leads por dia' })
  async leadsTrend(
    @OrganizationId() orgId: number,
    @Query() query: TrendQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.stats.leadsTrend(orgId, query);
    const fingerprint = JSON.stringify({ orgId, dateFrom: query.dateFrom || null, dateTo: query.dateTo || null, result });
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
