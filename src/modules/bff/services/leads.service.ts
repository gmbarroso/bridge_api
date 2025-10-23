import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CursorDto, LeadDetail, LeadTimelineResponse, ListLeadsDto, ListLeadsResponse } from '../dto/leads.dto';

function normalizePhone(input?: string | null): string | undefined {
  if (!input) return undefined;
  return input.replace(/\D/g, '');
}

function normalizeText(input?: string | null): string | undefined {
  if (!input) return undefined;
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

@Injectable()
export class LeadsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(orgId: number, dto: ListLeadsDto): Promise<ListLeadsResponse> {
    const limit = dto.limit ?? 20;

    let cursorCreatedAt: string | undefined;
    let cursorId: string | undefined;
    if (dto.cursor) {
      try {
        const raw = Buffer.from(dto.cursor, 'base64').toString('utf8');
        [cursorCreatedAt, cursorId] = raw.split('|');
      } catch {
        // ignore invalid cursor
      }
    }

    const params: any[] = [orgId];
    let where = 'luv.organization_id = $1';

    if (dto.stage) {
      params.push(dto.stage);
      where += ` AND luv.stage = $${params.length}`;
    }
    if (dto.source) {
      params.push(dto.source);
      where += ` AND luv.source = $${params.length}`;
    }
    if (dto.dateFrom) {
      params.push(dto.dateFrom);
      where += ` AND luv.created_at >= $${params.length}`;
    }
    if (dto.dateTo) {
      params.push(dto.dateTo);
      where += ` AND luv.created_at <= $${params.length}`;
    }

    if (dto.q) {
      const q = dto.q.trim();
      const qPhone = normalizePhone(q);
      const qText = normalizeText(q);
      if (qPhone) {
        params.push(qPhone);
        where += ` AND regexp_replace(luv.phone, '[^0-9]', '', 'g') ILIKE '%' || $${params.length} || '%'`;
      } else if (qText) {
        params.push(qText);
        where += ` AND (
          unaccent(lower(coalesce(luv.name,''))) ILIKE '%' || $${params.length} || '%'
          OR unaccent(lower(coalesce(luv.email,''))) ILIKE '%' || $${params.length} || '%'
        )`;
      }
    }

    if (cursorCreatedAt && cursorId) {
      params.push(cursorCreatedAt, cursorId);
      where += ` AND (luv.created_at, luv.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        luv.id, luv.public_id, luv.name, luv.phone, luv.email, luv.source, luv.stage,
        luv.created_at, luv.last_message_at
      FROM lead_unified_view luv
      WHERE ${where}
      ORDER BY luv.created_at DESC, luv.id DESC
      LIMIT ${limit + 1}
    `;

    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      id: r.public_id,
      name: r.name,
      phone: r.phone,
      source: r.source,
      stage: r.stage,
      createdAt: r.created_at,
      lastMessageAt: r.last_message_at,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.created_at}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }

  async detail(orgId: number, leadPublicId: string): Promise<LeadDetail | null> {
    const sql = `
      SELECT
        luv.id,
        luv.public_id,
        luv.name,
        luv.phone,
        luv.email,
        luv.source,
        luv.stage,
        luv.created_at,
        luv.last_message_at,
        luv.servico_desejado,
        luv.bairro,
        luv.plano_fidelidade,
        (
          SELECT COUNT(1)
          FROM conversations c
          WHERE c.organization_id = luv.organization_id AND c.lead_id = luv.id
        ) AS total_conversations,
        (
          SELECT COUNT(1)
          FROM messages m
          JOIN conversations c2 ON c2.id = m.conversation_id
          WHERE m.organization_id = luv.organization_id AND c2.lead_id = luv.id
        ) AS total_messages
      FROM lead_unified_view luv
      WHERE luv.organization_id = $1 AND luv.public_id = $2
      LIMIT 1
    `;
    const rows: any[] = await this.dataSource.query(sql, [orgId, leadPublicId]);
    const r = rows[0];
    if (!r) return null;
    const detail: LeadDetail = {
      id: r.public_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.source,
      stage: r.stage,
      createdAt: r.created_at,
      lastMessageAt: r.last_message_at,
      attributes: {
        servico_desejado: r.servico_desejado,
        bairro: r.bairro,
        plano_fidelidade: r.plano_fidelidade,
      },
      totals: {
        conversations: Number(r.total_conversations || 0),
        messages: Number(r.total_messages || 0),
      },
    };
    return detail;
  }

  async timeline(orgId: number, leadPublicId: string, dto: CursorDto): Promise<LeadTimelineResponse> {
    const limit = dto.limit ?? 20;

    let cursorCreatedAt: string | undefined;
    let cursorId: string | undefined;
    if (dto.cursor) {
      try {
        const raw = Buffer.from(dto.cursor, 'base64').toString('utf8');
        [cursorCreatedAt, cursorId] = raw.split('|');
      } catch {
        // ignore invalid cursor
      }
    }

    const params: any[] = [orgId, leadPublicId];
    let where = `m.organization_id = $1 AND c.lead_id = (
      SELECT id FROM leads WHERE organization_id = $1 AND public_id = $2
    )`;

    if (cursorCreatedAt && cursorId) {
      params.push(cursorCreatedAt, cursorId);
      where += ` AND (m.created_at, m.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        m.id,
        m.public_id,
        m.created_at,
        m.direction,
        m.type,
        m.payload,
        c.public_id AS conversation_public_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE ${where}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit + 1}
    `;

    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      kind: 'message' as const,
      id: r.public_id,
      createdAt: r.created_at,
      direction: r.direction,
      type: r.type,
      snippet: r.payload?.text || r.payload?.caption || null,
      conversationId: r.conversation_public_id,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.created_at}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }

  async conversationMessages(orgId: number, conversationPublicId: string, dto: CursorDto): Promise<LeadTimelineResponse> {
    const limit = dto.limit ?? 20;

    let cursorCreatedAt: string | undefined;
    let cursorId: string | undefined;
    if (dto.cursor) {
      try {
        const raw = Buffer.from(dto.cursor, 'base64').toString('utf8');
        [cursorCreatedAt, cursorId] = raw.split('|');
      } catch {
        // ignore invalid cursor
      }
    }

    const params: any[] = [orgId, conversationPublicId];
    let where = `m.organization_id = $1 AND m.conversation_id = (
      SELECT id FROM conversations WHERE organization_id = $1 AND public_id = $2
    )`;

    if (cursorCreatedAt && cursorId) {
      params.push(cursorCreatedAt, cursorId);
      where += ` AND (m.created_at, m.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        m.id,
        m.public_id,
        m.created_at,
        m.direction,
        m.type,
        m.payload
      FROM messages m
      WHERE ${where}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit + 1}
    `;
    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      kind: 'message' as const,
      id: r.public_id,
      createdAt: r.created_at,
      direction: r.direction,
      type: r.type,
      snippet: r.payload?.text || r.payload?.caption || null,
      conversationId: conversationPublicId,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.created_at}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }
}
