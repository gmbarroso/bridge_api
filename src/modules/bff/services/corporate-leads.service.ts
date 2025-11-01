import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CorporateLead } from '../../../database/entities/corporate-lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ListLeadsQueryDto } from '../dto/leads.dto';
import { BffCorporateLeadListItem, BffCorporateLeadListResponse } from '../../../common/swagger/success';

@Injectable()
export class CorporateLeadsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(orgId: number, query: ListLeadsQueryDto): Promise<BffCorporateLeadListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const qb = this.dataSource
      .getRepository(CorporateLead)
      .createQueryBuilder('lead')
      .leftJoin(Chat, 'chat', 'chat.corporate_lead_id = lead.id')
      .select([
        'lead.public_id AS lead_public_id',
        'lead.session_id AS session_id',
        'lead.company_name AS company_name',
        'lead.email AS email',
        'lead.phone AS phone',
        'lead.source AS source',
        'lead.stage AS stage',
        'lead.created_at AS created_at',
        'lead.last_message_at AS last_message_at',
        'chat.public_id AS conversation_public_id',
      ])
      .where('lead.organization_id = :orgId', { orgId })
      .orderBy('lead.created_at', 'DESC')
      .limit(limit);

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

    const rows = await qb.getRawMany();

    const items: BffCorporateLeadListItem[] = rows.map((row) => ({
      sessionId: row.session_id,
      leadPublicId: row.lead_public_id,
      companyName: row.company_name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      source: row.source ?? 'whatsapp',
      stage: row.stage ?? 'new',
      createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      lastMessageAt: row.last_message_at
        ? row.last_message_at?.toISOString?.() ?? new Date(row.last_message_at).toISOString()
        : null,
      conversationPublicId: row.conversation_public_id ?? null,
    }));

    return {
      items,
      nextCursor: null,
    };
  }
}
