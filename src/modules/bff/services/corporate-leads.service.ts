import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ListLeadsQueryDto } from '../dto/leads.dto';
import { BffCorporateLeadListItem, BffCorporateLeadListResponse } from '../../../common/swagger/success';

@Injectable()
export class CorporateLeadsService {
  constructor(private readonly dataSource: DataSource) {}

  private mapLeadToResponse(row: any): BffCorporateLeadListItem {
    return {
      sessionId: row.session_id,
      leadPublicId: row.lead_public_id,
      companyName: row.company_name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      source: row.source ?? 'whatsapp',
      stage: row.stage ?? 'new',
      pushName: row.pushname ?? null,
      createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      lastMessageAt: row.last_message_at
        ? row.last_message_at?.toISOString?.() ?? new Date(row.last_message_at).toISOString()
        : null,
      colaboradores: row.colaboradores !== null && row.colaboradores !== undefined ? Number(row.colaboradores) : null,
      tipoCliente: row.tipo_cliente ?? null,
      cargo: row.cargo ?? null,
      empresa: row.empresa ?? null,
      nomeAgendado: row.nome_agendado ?? null,
      cpfCnpj: row.cpf_cnpj ?? null,
      conversationPublicId: row.conversation_public_id ?? null,
    };
  }

  private encodeCursor(row: any): string {
    const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
    const timestamp = createdAt.toISOString();
    const id = row.lead_id ?? row.id ?? row.lead_public_id;
    return Buffer.from(`${timestamp}|${id}`).toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: number } {
    let decoded: string;
    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Cursor inválido');
    }
    const [ts, idStr] = decoded.split('|');
    const createdAt = new Date(ts);
    const id = Number(idStr);
    if (!ts || Number.isNaN(createdAt.getTime()) || !Number.isFinite(id)) {
      throw new BadRequestException('Cursor inválido');
    }
    return { createdAt, id };
  }

  async list(orgId: number, query: ListLeadsQueryDto): Promise<BffCorporateLeadListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const take = limit + 1;
    const useCursor = Boolean(query.cursor);
    const skip = !useCursor && query.page && query.page > 1 ? (query.page - 1) * limit : 0;

    const totalQb = this.dataSource.getRepository(Lead).createQueryBuilder('lead');
    totalQb
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere('lead.kind = :kind', { kind: 'corporate' });

    if (query.stage) {
      totalQb.andWhere('lead.stage = :stage', { stage: query.stage });
    }
    if (query.search) {
      const search = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      totalQb.andWhere(
        '(lead.company_name ILIKE :search OR lead.phone ILIKE :search OR lead.session_id ILIKE :search)',
        { search },
      );
    }

    const total = await totalQb.getCount();

    const qb = this.dataSource
      .getRepository(Lead)
      .createQueryBuilder('lead')
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere('lead.kind = :kind', { kind: 'corporate' });

    if (query.stage) {
      qb.andWhere('lead.stage = :stage', { stage: query.stage });
    }

    if (query.search) {
      const search = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      qb.andWhere(
        '(lead.company_name ILIKE :search OR lead.phone ILIKE :search OR lead.session_id ILIKE :search)',
        { search },
      );
    }

    qb.leftJoin(Chat, 'chat', 'chat.conversation_id = lead.session_id AND chat.organization_id = lead.organization_id')
      .select([
        'lead.id AS lead_id',
        'lead.public_id AS lead_public_id',
        'lead.session_id AS session_id',
        'lead.company_name AS company_name',
        'lead.email AS email',
        'lead.phone AS phone',
        'lead.source AS source',
        'lead.stage AS stage',
        'lead.pushname AS pushname',
        'lead.created_at AS created_at',
        'lead.last_message_at AS last_message_at',
        'lead.colaboradores AS colaboradores',
        'lead.tipo_cliente AS tipo_cliente',
        'lead.cargo AS cargo',
        'lead.empresa AS empresa',
        'lead.nome_agendado AS nome_agendado',
        'lead.cpf_cnpj AS cpf_cnpj',
        'chat.public_id AS conversation_public_id',
      ])
      .orderBy('lead.created_at', 'DESC')
      .addOrderBy('lead.id', 'DESC')
      .limit(take);

    if (skip > 0) {
      qb.offset(skip);
    }

    if (query.cursor) {
      const { createdAt, id } = this.decodeCursor(query.cursor);
      qb.andWhere('(lead.created_at, lead.id) < (:createdAt, :id)', { createdAt, id });
    }

    const rows = await qb.getRawMany();

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const items: BffCorporateLeadListItem[] = sliced.map((row) => this.mapLeadToResponse(row));

    const currentPage = useCursor ? query.page ?? 1 : query.page ?? 1;
    const hasNext = hasMore || Boolean(query.cursor);
    const hasPrevious = currentPage > 1 || Boolean(query.cursor);

    return {
      items,
      nextCursor: hasMore ? this.encodeCursor(rows[limit]) : null,
      total,
      page: currentPage,
      limit,
      hasNext,
      hasPrevious,
    };
  }
}
