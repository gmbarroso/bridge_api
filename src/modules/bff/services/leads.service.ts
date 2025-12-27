import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ListLeadsQueryDto, UpdateLeadDto, CreateLeadDto } from '../dto/leads.dto';
import { BffLeadListItem, BffLeadListResponse } from '../../../common/swagger/success';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LeadsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  private mapLeadToResponse(row: any): BffLeadListItem {
    return {
      kind: (row.kind ?? 'person') as 'person' | 'corporate',
      sessionId: row.session_id,
      leadPublicId: row.lead_public_id,
      companyName: row.company_name ?? null,
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
      pushName: row.pushname ?? null,
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

  private async listInternal(
    orgId: number,
    query: ListLeadsQueryDto,
    kind?: 'person' | 'corporate',
  ): Promise<BffLeadListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const take = limit + 1;
    const useCursor = Boolean(query.cursor);
    const skip = !useCursor && query.page && query.page > 1 ? (query.page - 1) * limit : 0;

    const totalQb = this.dataSource.getRepository(Lead).createQueryBuilder('lead');
    totalQb
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere(kind ? 'lead.kind = :kind' : '1=1', { kind });

    if (query.stage) {
      totalQb.andWhere('lead.stage = :stage', { stage: query.stage });
    }
    if (query.search) {
      const search = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      totalQb.andWhere(
        '(lead.name ILIKE :search OR lead.phone ILIKE :search OR lead.email ILIKE :search OR lead.session_id ILIKE :search OR lead.company_name ILIKE :search)',
        { search },
      );
    }

    if (query.dateFrom) {
      totalQb.andWhere('lead.created_at >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      totalQb.andWhere('lead.created_at <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    const total = await totalQb.getCount();

    const qb = this.dataSource
      .getRepository(Lead)
      .createQueryBuilder('lead')
      .where('lead.organization_id = :orgId', { orgId });

    if (kind) {
      qb.andWhere('lead.kind = :kind', { kind });
    }

    if (query.stage) {
      qb.andWhere('lead.stage = :stage', { stage: query.stage });
    }

    if (query.search) {
      const search = `%${query.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      qb.andWhere(
        '(lead.name ILIKE :search OR lead.phone ILIKE :search OR lead.email ILIKE :search OR lead.session_id ILIKE :search OR lead.company_name ILIKE :search)',
        { search },
      );
    }

    if (query.dateFrom) {
      qb.andWhere('lead.created_at >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('lead.created_at <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    qb.leftJoin(Chat, 'chat', 'chat.conversation_id = lead.session_id AND chat.organization_id = lead.organization_id')
      .select([
        'lead.id AS lead_id',
        'lead.public_id AS lead_public_id',
        'lead.session_id AS session_id',
        'lead.kind AS kind',
        'lead.company_name AS company_name',
        'lead.name AS name',
        'lead.email AS email',
        'lead.phone AS phone',
        'lead.source AS source',
        'lead.stage AS stage',
        'lead.created_at AS created_at',
        'lead.last_message_at AS last_message_at',
        'lead.servico AS servico',
        'lead.pushname AS pushname',
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
    const items: BffLeadListItem[] = sliced.map((row) => this.mapLeadToResponse(row));

    const nextCursor = hasMore ? this.encodeCursor(rows[limit]) : null;
    const currentPage = useCursor ? query.page ?? 1 : query.page ?? 1;
    const hasNext = hasMore || Boolean(nextCursor);
    const hasPrevious = currentPage > 1 || Boolean(query.cursor);

    return {
      items,
      nextCursor,
      total,
      page: currentPage,
      limit,
      hasNext,
      hasPrevious,
    };
  }

  async list(orgId: number, query: ListLeadsQueryDto): Promise<BffLeadListResponse> {
    return this.listInternal(orgId, query, 'person');
  }

  async listAll(orgId: number, query: ListLeadsQueryDto): Promise<BffLeadListResponse> {
    return this.listInternal(orgId, query);
  }

  async update(orgId: number, dto: UpdateLeadDto): Promise<BffLeadListItem> {
    if (!dto.sessionId && !dto.leadPublicId) {
      throw new BadRequestException('Informe sessionId ou leadPublicId');
    }

    const leadRepo = this.dataSource.getRepository(Lead);

    const lead = await leadRepo.findOne({
      where: {
        organization_id: orgId,
        ...(dto.sessionId ? { session_id: dto.sessionId } : {}),
        ...(dto.leadPublicId ? { public_id: dto.leadPublicId } : {}),
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const previousStage = lead.stage;

    if (dto.kind) lead.kind = dto.kind;
    if (dto.name !== undefined) lead.name = dto.name ?? null;
    if (dto.companyName !== undefined) lead.company_name = dto.companyName ?? null;
    if (dto.phone !== undefined) lead.phone = dto.phone ?? null;
    if (dto.email !== undefined) lead.email = dto.email ?? null;
    if (dto.stage !== undefined) lead.stage = dto.stage ?? lead.stage;
    if (dto.document !== undefined) lead.document = dto.document ?? null;
    if (dto.servico !== undefined) lead.servico = dto.servico ?? null;
    if (dto.colaboradores !== undefined) lead.colaboradores = dto.colaboradores ?? null;
    if (dto.tipoCliente !== undefined) lead.tipo_cliente = dto.tipoCliente ?? null;
    if (dto.cargo !== undefined) lead.cargo = dto.cargo ?? null;
    if (dto.empresa !== undefined) lead.empresa = dto.empresa ?? null;
    if (dto.nomeAgendado !== undefined) lead.nome_agendado = dto.nomeAgendado ?? null;
    if (dto.cpfCnpj !== undefined) lead.cpf_cnpj = dto.cpfCnpj ?? null;

    await leadRepo.save(lead);

    if (dto.stage && dto.stage !== previousStage) {
      await this.notifications.notifyLeadStageChanged(lead, previousStage, dto.stage);
    }

    const row = await this.dataSource
      .getRepository(Lead)
      .createQueryBuilder('lead')
      .leftJoin(Chat, 'chat', 'chat.conversation_id = lead.session_id AND chat.organization_id = lead.organization_id')
      .select([
        'lead.id AS lead_id',
        'lead.public_id AS lead_public_id',
        'lead.session_id AS session_id',
        'lead.kind AS kind',
        'lead.company_name AS company_name',
        'lead.name AS name',
        'lead.email AS email',
        'lead.phone AS phone',
        'lead.source AS source',
        'lead.stage AS stage',
        'lead.created_at AS created_at',
        'lead.last_message_at AS last_message_at',
        'lead.servico AS servico',
        'lead.pushname AS pushname',
        'lead.colaboradores AS colaboradores',
        'lead.tipo_cliente AS tipo_cliente',
        'lead.cargo AS cargo',
        'lead.empresa AS empresa',
        'lead.nome_agendado AS nome_agendado',
        'lead.cpf_cnpj AS cpf_cnpj',
        'chat.public_id AS conversation_public_id',
      ])
      .where('lead.id = :id', { id: lead.id })
      .andWhere('lead.organization_id = :orgId', { orgId })
      .getRawOne();

    return this.mapLeadToResponse(row);
  }

  async create(orgId: number, dto: CreateLeadDto): Promise<BffLeadListItem> {
    const leadRepo = this.dataSource.getRepository(Lead);

    if (!dto.name && !dto.companyName && !dto.phone) {
      throw new BadRequestException('Informe pelo menos nome, empresa ou telefone');
    }

    const sessionId = dto.sessionId || `session-${randomUUID()}`;

    const existing = await leadRepo.findOne({ where: { session_id: sessionId } });
    if (existing) {
      throw new BadRequestException('sessionId já existe, escolha outro');
    }

    const lead = leadRepo.create({
      organization_id: orgId,
      sub_organization_id: null,
      session_id: sessionId,
      kind: dto.kind || 'person',
      stage: dto.stage || 'new',
      source: 'manual',
      name: dto.name ?? null,
      company_name: dto.companyName ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      document: dto.document ?? null,
      servico: dto.servico ?? null,
      colaboradores: dto.colaboradores ?? null,
      tipo_cliente: dto.tipoCliente ?? null,
      cargo: dto.cargo ?? null,
      empresa: dto.empresa ?? null,
      nome_agendado: dto.nomeAgendado ?? null,
      cpf_cnpj: dto.cpfCnpj ?? null,
    });

    const saved: Lead = await leadRepo.save(lead);
    await this.notifications.notifyLeadCreated(saved);
    return this.mapLeadToResponse({
      ...saved,
      lead_id: saved.id,
      lead_public_id: saved.public_id,
      session_id: saved.session_id,
    });
  }
}
