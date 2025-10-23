import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TrendQueryDto, SummaryStats, TrendResponse } from '../dto/stats.dto';

function toDateOnlyUTC(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable()
export class StatsService {
  constructor(private readonly dataSource: DataSource) {}

  async summary(orgId: number): Promise<SummaryStats> {
    const sql = `
      WITH by_stage AS (
        SELECT stage, COUNT(1) AS c
        FROM leads
        WHERE organization_id = $1
        GROUP BY stage
      ),
      today AS (
        SELECT COUNT(1) AS c
        FROM leads
        WHERE organization_id = $1 AND created_at::date = (now() AT TIME ZONE 'UTC')::date
      ),
      active24h AS (
        SELECT COUNT(1) AS c
        FROM leads
        WHERE organization_id = $1 AND last_message_at >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
      )
      SELECT
        (SELECT COUNT(1) FROM leads WHERE organization_id = $1) AS total_leads,
        COALESCE((SELECT jsonb_object_agg(stage, c) FROM by_stage), '{}'::jsonb) AS leads_by_stage,
        (SELECT c FROM today) AS leads_today,
        (SELECT c FROM active24h) AS active_leads_last_24h
    `;
    const rows: any[] = await this.dataSource.query(sql, [orgId]);
    const r = rows[0];
    return {
      totalLeads: Number(r.total_leads || 0),
      leadsByStage: r.leads_by_stage || {},
      leadsToday: Number(r.leads_today || 0),
      activeLeadsLast24h: Number(r.active_leads_last_24h || 0),
    };
  }

  async leadsTrend(orgId: number, dto: TrendQueryDto): Promise<TrendResponse> {
    // Defaults: last 14 days inclusive
    const end = dto.dateTo ? new Date(dto.dateTo) : new Date();
    const start = dto.dateFrom ? new Date(dto.dateFrom) : new Date(end.getTime() - 13 * 24 * 3600 * 1000);

    const sql = `
      WITH series AS (
        SELECT d::date AS day
        FROM generate_series($2::date, $3::date, interval '1 day') d
      )
      SELECT s.day::text AS day, COALESCE(cnt.c, 0) AS count
      FROM series s
      LEFT JOIN (
        SELECT created_at::date AS day, COUNT(1) AS c
        FROM leads
        WHERE organization_id = $1 AND created_at::date BETWEEN $2::date AND $3::date
        GROUP BY created_at::date
      ) cnt ON cnt.day = s.day
      ORDER BY s.day ASC
    `;

    const rows: any[] = await this.dataSource.query(sql, [orgId, toDateOnlyUTC(start), toDateOnlyUTC(end)]);
    return {
      points: rows.map((r) => ({ date: r.day, count: Number(r.count || 0) })),
    };
  }
}
