import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ListLeadsQueryDto } from '../dto/leads.dto';
import { BffLeadListItem, BffLeadListResponse } from '../../../common/swagger/success';

@Injectable()
export class LeadsService {
  constructor(private readonly dataSource: DataSource) {}

  async list(orgId: number, query: ListLeadsQueryDto): Promise<BffLeadListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const qb = this.dataSource
      .getRepository(Lead)
      .createQueryBuilder('lead')
      .leftJoin(Chat, 'chat', 'chat.conversation_id = lead.session_id AND chat.organization_id = lead.organization_id')
      .select([
        'lead.public_id AS lead_public_id',
        'lead.session_id AS session_id',
        'lead.name AS name',
        'lead.email AS email',
        'lead.phone AS phone',
        'lead.source AS source',
        'lead.stage AS stage',
        'lead.created_at AS created_at',
        'lead.last_message_at AS last_message_at',
        'lead.servico AS servico',
        'lead.colaboradores AS colaboradores',
        'lead.tipo_cliente AS tipo_cliente',
        'lead.cargo AS cargo',
        'lead.empresa AS empresa',
        'lead.nome_agendado AS nome_agendado',
        'lead.cpf_cnpj AS cpf_cnpj',
        'chat.public_id AS conversation_public_id',
      ])
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere('lead.kind = :kind', { kind: 'person' })
      .orderBy('lead.created_at', 'DESC')
      .limit(limit);

    if (query.stage) {
      qb.andWhere('lead.stage = :stage', { stage: query.stage });
    }

    if (query.search) {
      const search = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      qb.andWhere(
        '(lead.name ILIKE :search OR lead.phone ILIKE :search OR lead.email ILIKE :search OR lead.session_id ILIKE :search)',
        { search },
      );
    }

    const rows = await qb.getRawMany();

    const items: BffLeadListItem[] = rows.map((row) => ({
      sessionId: row.session_id,
      leadPublicId: row.lead_public_id,
      name: row.name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      source: row.source ?? 'whatsapp',
      stage: row.stage ?? 'new',
      createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      lastMessageAt: row.last_message_at
        ? row.last_message_at?.toISOString?.() ?? new Date(row.last_message_at).toISOString()
        : null,
      servico: row.servico ?? null,
      colaboradores: row.colaboradores !== null && row.colaboradores !== undefined ? Number(row.colaboradores) : null,
      tipoCliente: row.tipo_cliente ?? null,
      cargo: row.cargo ?? null,
      empresa: row.empresa ?? null,
      nomeAgendado: row.nome_agendado ?? null,
      cpfCnpj: row.cpf_cnpj ?? null,
      conversationPublicId: row.conversation_public_id ?? null,
    }));

    return {
      items,
      nextCursor: null,
    };
  }
}
