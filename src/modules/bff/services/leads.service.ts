import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CursorDto, LeadDetail, LeadServiceHistoryResponse, LeadTimelineResponse, ListLeadsDto, ListLeadsResponse } from '../dto/leads.dto';

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
    let where = 'l.organization_id = $1';

    if (dto.stage) {
      params.push(dto.stage);
      where += ` AND l.stage = $${params.length}`;
    }
    if (dto.source) {
      params.push(dto.source);
      where += ` AND l.source = $${params.length}`;
    }
    if (dto.dateFrom) {
      params.push(dto.dateFrom);
      where += ` AND l.created_at >= $${params.length}`;
    }
    if (dto.dateTo) {
      params.push(dto.dateTo);
      where += ` AND l.created_at <= $${params.length}`;
    }

    if (dto.q) {
      const q = dto.q.trim();
      const qPhone = normalizePhone(q);
      const qText = normalizeText(q);
      if (qPhone) {
        params.push(qPhone);
        where += ` AND regexp_replace(l.phone, '[^0-9]', '', 'g') ILIKE '%' || $${params.length} || '%'`;
      } else if (qText) {
        params.push(qText);
        where += ` AND (
          unaccent(lower(coalesce(l.name,''))) ILIKE '%' || $${params.length} || '%'
          OR unaccent(lower(coalesce(l.email,''))) ILIKE '%' || $${params.length} || '%'
        )`;
      }
    }

    if (cursorCreatedAt && cursorId) {
      params.push(cursorCreatedAt, cursorId);
      where += ` AND (l.created_at, l.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        l.id,
        l.public_id,
        l.name,
        l.phone,
        l.email,
        l.source,
        l.stage,
        l.created_at,
        l.last_message_at,
        l.extra_attributes
      FROM leads l
      WHERE ${where}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limit + 1}
    `;

    const rows = await this.dataSource.query(sql, params);
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
      servico_desejado: (r.extra_attributes || {})?.servico_desejado ?? null,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.sent_at}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }

  async detail(orgId: number, leadPublicId: string): Promise<LeadDetail | null> {
    const sql = `
      SELECT
        l.id,
        l.public_id,
        l.name,
        l.phone,
        l.email,
        l.source,
        l.stage,
        l.created_at,
        l.last_message_at,
        l.extra_attributes,
        (
          SELECT COUNT(1)
          FROM chats c
          WHERE c.organization_id = l.organization_id AND c.lead_id = l.id
        ) AS total_chats,
        (
          SELECT COUNT(1)
          FROM chat_messages m
          WHERE m.organization_id = l.organization_id AND m.lead_id = l.id
        ) AS total_messages
      FROM leads l
      WHERE l.organization_id = $1 AND l.public_id = $2
      LIMIT 1
    `;
    const rows: any[] = await this.dataSource.query(sql, [orgId, leadPublicId]);
    const r = rows[0];
    if (!r) return null;
    const extras: Record<string, any> = r.extra_attributes || {};
    // Fetch all service links for this lead (most recent first)
    const linksSql = `
      SELECT s.slug, s.title, lsl.relation, lsl.ts
      FROM lead_service_links lsl
      JOIN services s ON s.id = lsl.service_id
      WHERE lsl.organization_id = $1 AND lsl.lead_id = $2
      ORDER BY lsl.ts DESC, lsl.id DESC
    `;
    const linkRows: any[] = await this.dataSource.query(linksSql, [orgId, r.id]);
    const detail: LeadDetail = {
      id: r.public_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.source,
      stage: r.stage,
      createdAt: r.created_at,
      lastMessageAt: r.last_message_at,
      desiredService: extras.servico_desejado ?? null,
      serviceLinks: linkRows.map((lr) => ({
        slug: lr.slug,
        title: lr.title ?? null,
        relation: lr.relation,
        ts: lr.ts,
      })),
      attributes: {
        servico_desejado: extras.servico_desejado ?? null,
        bairro: extras.bairro ?? null,
        plano_fidelidade: extras.plano_fidelidade ?? null,
      },
      totals: {
        conversations: Number(r.total_chats || 0),
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
      where += ` AND (m.sent_at, m.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        m.id,
        m.public_id,
        m.sent_at,
        m.direction,
        m.message_type,
        m.payload,
        c.public_id AS chat_public_id
      FROM chat_messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE ${where}
      ORDER BY m.sent_at DESC, m.id DESC
      LIMIT ${limit + 1}
    `;

    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      kind: 'message' as const,
      id: r.public_id,
      createdAt: r.sent_at,
      direction: r.direction,
      type: r.message_type,
      snippet: r.payload?.text || r.payload?.caption || null,
      conversationId: r.chat_public_id,
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
    let where = `m.organization_id = $1 AND m.chat_id = (
      SELECT id FROM chats WHERE organization_id = $1 AND public_id = $2
    )`;

    if (cursorCreatedAt && cursorId) {
      params.push(cursorCreatedAt, cursorId);
      where += ` AND (m.sent_at, m.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT
        m.id,
        m.public_id,
        m.sent_at,
        m.direction,
        m.message_type,
        m.payload
      FROM chat_messages m
      WHERE ${where}
      ORDER BY m.sent_at DESC, m.id DESC
      LIMIT ${limit + 1}
    `;
    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      kind: 'message' as const,
      id: r.public_id,
      createdAt: r.sent_at,
      direction: r.direction,
      type: r.message_type,
      snippet: r.payload?.text || r.payload?.caption || null,
      conversationId: conversationPublicId,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.sent_at}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }

  async serviceHistory(orgId: number, leadPublicId: string, dto: CursorDto): Promise<LeadServiceHistoryResponse> {
    const limit = dto.limit ?? 20;

    let cursorTs: string | undefined;
    let cursorId: string | undefined;
    if (dto.cursor) {
      try {
        const raw = Buffer.from(dto.cursor, 'base64').toString('utf8');
        [cursorTs, cursorId] = raw.split('|');
      } catch {}
    }

    const params: any[] = [orgId, leadPublicId];
    let where = `lse.organization_id = $1 AND lse.lead_id = (SELECT id FROM leads WHERE organization_id = $1 AND public_id = $2)`;
    if (cursorTs && cursorId) {
      params.push(cursorTs, cursorId);
      where += ` AND (lse.ts, lse.id) < ($${params.length - 1}::timestamptz, $${params.length}::bigint)`;
    }

    const sql = `
      SELECT lse.id, lse.public_id, lse.ts, lse.relation, lse.source, s.slug, s.title
      FROM lead_service_events lse
      JOIN services s ON s.id = lse.service_id
      WHERE ${where}
      ORDER BY lse.ts DESC, lse.id DESC
      LIMIT ${limit + 1}
    `;
    const rows: any[] = await this.dataSource.query(sql, params);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => ({
      kind: 'service_event' as const,
      id: r.public_id,
      createdAt: r.ts,
      slug: r.slug,
      title: r.title ?? null,
      relation: r.relation,
      source: r.source ?? null,
    }));

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = rows[limit - 1];
      nextCursor = Buffer.from(`${last.ts}|${last.id}`, 'utf8').toString('base64');
    }

    return { items, nextCursor };
  }
}
