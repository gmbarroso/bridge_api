import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Document } from '../../../database/entities/document.entity';
import { Lead } from '../../../database/entities/lead.entity';
import {
  AppointmentStatus,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentDto,
} from '../dto/appointments.dto';
import { NotificationsService } from '../../notifications/notifications.service';

const ALLOWED_STATUSES: AppointmentStatus[] = ['scheduled', 'canceled', 'done', 'no_show'];

type AppointmentMetadata = {
  lead_id: number;
  service: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  google_event_id?: string | null;
};

type AppointmentLeadSummary = {
  id: number;
  name: string | null;
  phone: string | null;
  service: string | null;
  companyName: string | null;
};

export type AppointmentItem = {
  id: number;
  organizationId: number;
  subOrganizationId: number | null;
  leadId: number;
  service: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lead?: AppointmentLeadSummary;
};

export type AppointmentListResponse = {
  items: AppointmentItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  private parseDate(value: string | Date | null | undefined, field: string): Date {
    if (!value) {
      throw new BadRequestException(`${field} é obrigatório`);
    }
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime())) {
      throw new BadRequestException(`${field} inválido`);
    }
    return dt;
  }

  private ensureSameSuborganization(lead: Lead, userSubOrgId: number | null | undefined) {
    if (userSubOrgId !== null && userSubOrgId !== undefined && lead.sub_organization_id !== userSubOrgId) {
      throw new NotFoundException('Lead não encontrado na sub-organização do usuário');
    }
  }

  private async findLeadForAppointment(orgId: number, leadId: number, userSubOrgId: number | null) {
    const lead = await this.dataSource.getRepository(Lead).findOne({
      where: { id: leadId, organization_id: orgId },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }
    this.ensureSameSuborganization(lead, userSubOrgId);
    return lead;
  }

  private ensureStartBeforeEnd(start: Date, end: Date) {
    if (start >= end) {
      throw new BadRequestException('startTime deve ser anterior a endTime');
    }
  }

  private async assertNoOverlap(
    orgId: number,
    subOrgId: number | null,
    start: Date,
    end: Date,
    excludeId?: number,
  ) {
    const qb = this.dataSource
      .getRepository(Document)
      .createQueryBuilder('document')
      .where('document.organization_id = :orgId', { orgId })
      .andWhere("(document.metadata->>'start_time')::timestamptz < :end", { end })
      .andWhere("(document.metadata->>'end_time')::timestamptz > :start", { start });

    if (subOrgId !== null && subOrgId !== undefined) {
      qb.andWhere('document.sub_organization_id = :subOrgId', { subOrgId });
    }

    if (excludeId) {
      qb.andWhere('document.id != :excludeId', { excludeId });
    }

    const conflict = await qb.getOne();
    if (conflict) {
      throw new BadRequestException('Já existe um agendamento neste horário');
    }
  }

  private buildTitle(lead: Lead, service: string | null, start: Date): string {
    const name = lead.name || lead.company_name || 'Lead';
    const serviceLabel = service || lead.servico || 'Serviço';
    return `${serviceLabel} - ${name} - ${start.toISOString()}`;
  }

  private buildContent(lead: Lead, service: string | null, start: Date, end: Date, status: AppointmentStatus): string {
    const name = lead.name || lead.company_name || 'Lead';
    const serviceLabel = service || lead.servico || 'Serviço';
    const phone = lead.phone ? ` | Tel: ${lead.phone}` : '';
    return `${name}${phone} | ${serviceLabel} | ${start.toISOString()} -> ${end.toISOString()} | status: ${status}`;
  }

  private normalizeMetadata(raw: any): AppointmentMetadata {
    const parsed = typeof raw === 'string' ? (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    })() : (raw || {});

    if (!parsed.lead_id) {
      throw new BadRequestException('Documento sem lead_id em metadata');
    }
    if (!parsed.start_time || !parsed.end_time) {
      throw new BadRequestException('Documento sem start_time ou end_time em metadata');
    }

    const normalizedStatus = ALLOWED_STATUSES.includes(parsed.status) ? parsed.status : 'scheduled';

    return {
      lead_id: Number(parsed.lead_id),
      service: parsed.service ?? null,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      status: normalizedStatus,
      notes: parsed.notes ?? null,
      google_event_id: parsed.google_event_id ?? null,
    };
  }

  private mapRowToItem(row: any): AppointmentItem {
    const metadata = this.normalizeMetadata(row.metadata);
    const leadSummary: AppointmentLeadSummary | undefined = metadata.lead_id
      ? {
          id: Number(metadata.lead_id),
          name: row.lead_name ?? null,
          phone: row.lead_phone ?? null,
          service: row.lead_servico ?? row.lead_service ?? null,
          companyName: row.lead_company_name ?? null,
        }
      : undefined;

    return {
      id: Number(row.id),
      organizationId: Number(row.organization_id),
      subOrganizationId: row.sub_organization_id !== null && row.sub_organization_id !== undefined
        ? Number(row.sub_organization_id)
        : null,
      leadId: Number(metadata.lead_id),
      service: metadata.service ?? null,
      startTime: metadata.start_time,
      endTime: metadata.end_time,
      status: metadata.status,
      notes: metadata.notes ?? null,
      title: row.title,
      content: row.content,
      createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      updatedAt: row.updated_at?.toISOString?.() ?? new Date(row.updated_at).toISOString(),
      lead: leadSummary,
    };
  }

  private buildResponseFromDocument(doc: Document, lead: Lead): AppointmentItem {
    const metadata = this.normalizeMetadata(doc.metadata);
    return {
      id: Number(doc.id),
      organizationId: Number(doc.organization_id),
      subOrganizationId: doc.sub_organization_id !== null && doc.sub_organization_id !== undefined
        ? Number(doc.sub_organization_id)
        : null,
      leadId: Number(metadata.lead_id),
      service: metadata.service ?? null,
      startTime: metadata.start_time,
      endTime: metadata.end_time,
      status: metadata.status,
      notes: metadata.notes ?? null,
      title: doc.title,
      content: doc.content,
      createdAt: doc.created_at?.toISOString?.() ?? new Date(doc.created_at).toISOString(),
      updatedAt: doc.updated_at?.toISOString?.() ?? new Date(doc.updated_at).toISOString(),
      lead: {
        id: lead.id,
        name: lead.name ?? lead.company_name ?? null,
        phone: lead.phone ?? null,
        service: lead.servico ?? null,
        companyName: lead.company_name ?? null,
      },
    };
  }

  async list(orgId: number, userSubOrgId: number | null, query: ListAppointmentsQueryDto): Promise<AppointmentListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 200);
    const page = Math.max(query.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const repo = this.dataSource.getRepository(Document);
    const baseQb = repo
      .createQueryBuilder('document')
      .leftJoin(Lead, 'lead', "lead.id = (document.metadata->>'lead_id')::bigint AND lead.organization_id = document.organization_id")
      .where('document.organization_id = :orgId', { orgId })
      .andWhere("(document.metadata->>'lead_id') IS NOT NULL")
      .andWhere("(document.metadata->>'start_time') IS NOT NULL");

    if (userSubOrgId !== null && userSubOrgId !== undefined) {
      baseQb.andWhere('document.sub_organization_id = :subOrgId', { subOrgId: userSubOrgId });
    }

    if (query.leadId) {
      baseQb.andWhere("(document.metadata->>'lead_id')::bigint = :leadId", { leadId: query.leadId });
    }
    if (query.status) {
      baseQb.andWhere("(document.metadata->>'status') = :status", { status: query.status });
    }
    if (query.from) {
      baseQb.andWhere("(document.metadata->>'start_time')::timestamptz >= :from", { from: new Date(query.from) });
    }
    if (query.to) {
      baseQb.andWhere("(document.metadata->>'start_time')::timestamptz <= :to", { to: new Date(query.to) });
    }

    const total = await baseQb.clone().getCount();

    const rows = await baseQb
      .clone()
      .select([
        'document.id AS id',
        'document.organization_id AS organization_id',
        'document.sub_organization_id AS sub_organization_id',
        'document.metadata AS metadata',
        'document.title AS title',
        'document.content AS content',
        'document.created_at AS created_at',
        'document.updated_at AS updated_at',
        'lead.name AS lead_name',
        'lead.phone AS lead_phone',
        'lead.servico AS lead_servico',
        'lead.company_name AS lead_company_name',
      ])
      .orderBy("(document.metadata->>'start_time')::timestamptz", 'DESC')
      .addOrderBy('document.id', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const items = rows.map((row) => this.mapRowToItem(row));
    const hasPrevious = page > 1;
    const hasNext = page * limit < total;

    return {
      items,
      total,
      page,
      limit,
      hasNext,
      hasPrevious,
    };
  }

  async create(orgId: number, userSubOrgId: number | null, dto: CreateAppointmentDto): Promise<AppointmentItem> {
    const lead = await this.findLeadForAppointment(orgId, dto.leadId, userSubOrgId);
    const start = this.parseDate(dto.startTime, 'startTime');
    const end = this.parseDate(dto.endTime, 'endTime');
    this.ensureStartBeforeEnd(start, end);
    await this.assertNoOverlap(orgId, lead.sub_organization_id ?? null, start, end);

    const metadata: AppointmentMetadata = {
      lead_id: lead.id,
      service: dto.service ?? lead.servico ?? null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: dto.status ?? 'scheduled',
      notes: dto.notes ?? null,
    };

    const repo = this.dataSource.getRepository(Document);
    const document = repo.create({
      organization_id: orgId,
      sub_organization_id: lead.sub_organization_id ?? null,
      title: this.buildTitle(lead, metadata.service, start),
      content: this.buildContent(lead, metadata.service, start, end, metadata.status),
      metadata,
    });

    const saved = await repo.save(document);

    await this.notifications.notifyNewAppointment({
      lead,
      startTime: metadata.start_time,
      endTime: metadata.end_time,
      status: metadata.status,
      service: metadata.service,
      notes: metadata.notes ?? null,
    });

    return this.buildResponseFromDocument(saved, lead);
  }

  async update(orgId: number, userSubOrgId: number | null, id: number, dto: UpdateAppointmentDto): Promise<AppointmentItem> {
    const repo = this.dataSource.getRepository(Document);
    const document = await repo.findOne({
      where: { id, organization_id: orgId },
    });
    if (!document) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const metadata = this.normalizeMetadata(document.metadata);
    const lead = await this.findLeadForAppointment(orgId, metadata.lead_id, userSubOrgId);

    if (userSubOrgId !== null && userSubOrgId !== undefined && document.sub_organization_id !== userSubOrgId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const nextMetadata: AppointmentMetadata = {
      ...metadata,
      service: dto.service !== undefined ? dto.service ?? null : metadata.service,
      status: dto.status ?? metadata.status,
      notes: dto.notes !== undefined ? dto.notes ?? null : metadata.notes ?? null,
    };

    nextMetadata.start_time = dto.startTime
      ? this.parseDate(dto.startTime, 'startTime').toISOString()
      : metadata.start_time;
    nextMetadata.end_time = dto.endTime ? this.parseDate(dto.endTime, 'endTime').toISOString() : metadata.end_time;

    const start = this.parseDate(nextMetadata.start_time, 'startTime');
    const end = this.parseDate(nextMetadata.end_time, 'endTime');
    this.ensureStartBeforeEnd(start, end);
    await this.assertNoOverlap(orgId, lead.sub_organization_id ?? null, start, end, document.id);

    const previousStatus = metadata.status;
    document.metadata = nextMetadata;
    document.sub_organization_id = lead.sub_organization_id ?? null;
    document.title = this.buildTitle(lead, nextMetadata.service, start);
    document.content = this.buildContent(lead, nextMetadata.service, start, end, nextMetadata.status);

    const saved = await repo.save(document);

    if (nextMetadata.status !== previousStatus) {
      await this.notifications.notifyAppointmentStatusChanged({
        lead,
        fromStatus: previousStatus,
        toStatus: nextMetadata.status,
        startTime: nextMetadata.start_time,
        endTime: nextMetadata.end_time,
        service: nextMetadata.service,
      });
    }

    return this.buildResponseFromDocument(saved, lead);
  }

  async delete(orgId: number, userSubOrgId: number | null, id: number) {
    const repo = this.dataSource.getRepository(Document);
    const document = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!document) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const metadata = this.normalizeMetadata(document.metadata);
    const lead = await this.findLeadForAppointment(orgId, metadata.lead_id, userSubOrgId);

    if (userSubOrgId !== null && userSubOrgId !== undefined && document.sub_organization_id !== userSubOrgId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    await repo.delete({ id: document.id, organization_id: orgId });

    await this.notifications.notifyAppointmentStatusChanged({
      lead,
      fromStatus: metadata.status,
      toStatus: 'canceled',
      startTime: metadata.start_time,
      endTime: metadata.end_time,
      service: metadata.service,
    });

    return { deleted: true };
  }
}
