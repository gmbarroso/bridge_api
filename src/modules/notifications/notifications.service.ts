import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { Lead } from '../../database/entities/lead.entity';

type AppointmentStatus = 'scheduled' | 'canceled' | 'done' | 'no_show';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async createNotification(params: {
    organizationId: number
    subOrganizationId?: number | null
    type: string
    lead?: Lead | null
    payload?: Record<string, any>
  }) {
    const notification = this.notificationRepo.create({
      organization_id: params.organizationId,
      sub_organization_id: params.subOrganizationId ?? null,
      type: params.type,
      lead_id: params.lead?.id ?? null,
      payload: params.payload ?? {},
      read_at: null,
    });
    return this.notificationRepo.save(notification);
  }

  async notifyLeadCreated(lead: Lead) {
    return this.createNotification({
      organizationId: lead.organization_id,
      subOrganizationId: lead.sub_organization_id,
      type: 'new_lead',
      lead,
      payload: {
        name: lead.name,
        companyName: lead.company_name,
        phone: lead.phone,
        kind: lead.kind,
        stage: lead.stage,
      },
    });
  }

  async notifyLeadStageChanged(lead: Lead, fromStage: string, toStage: string) {
    return this.createNotification({
      organizationId: lead.organization_id,
      subOrganizationId: lead.sub_organization_id,
      type: 'status_change',
      lead,
      payload: {
        name: lead.name,
        companyName: lead.company_name,
        phone: lead.phone,
        from: fromStage,
        to: toStage,
      },
    });
  }

  async notifyNewAppointment(params: {
    lead: Lead
    startTime: string
    endTime: string
    status: AppointmentStatus
    service: string | null
    notes?: string | null
  }) {
    return this.createNotification({
      organizationId: params.lead.organization_id,
      subOrganizationId: params.lead.sub_organization_id,
      type: 'new_appointment',
      lead: params.lead,
      payload: {
        startTime: params.startTime,
        endTime: params.endTime,
        status: params.status,
        service: params.service,
        notes: params.notes ?? null,
      },
    });
  }

  async notifyAppointmentStatusChanged(params: {
    lead: Lead
    fromStatus: AppointmentStatus
    toStatus: AppointmentStatus
    startTime: string
    endTime: string
    service: string | null
  }) {
    return this.createNotification({
      organizationId: params.lead.organization_id,
      subOrganizationId: params.lead.sub_organization_id,
      type: 'appointment_status_change',
      lead: params.lead,
      payload: {
        from: params.fromStatus,
        to: params.toStatus,
        startTime: params.startTime,
        endTime: params.endTime,
        service: params.service,
      },
    });
  }

  async list(organizationId: number, query: ListNotificationsDto) {
    const limit = Math.min(query.limit ?? 5, 200);
    const page = Math.max(query.page ?? 1, 1);
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { organization_id: organizationId };
    if (query.unreadOnly) {
      where.read_at = IsNull();
    }

    const [items, total] = await this.notificationRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { organization_id: organizationId, read_at: IsNull() },
    });

    return {
      items,
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async markRead(organizationId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, organization_id: organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (!notification.read_at) {
      notification.read_at = new Date();
      await this.notificationRepo.save(notification);
    }

    return notification;
  }

  async markAllRead(organizationId: number) {
    await this.notificationRepo.update(
      { organization_id: organizationId, read_at: IsNull() },
      { read_at: new Date() },
    );
    const unreadCount = await this.notificationRepo.count({
      where: { organization_id: organizationId, read_at: IsNull() },
    });
    return { unreadCount: unreadCount ?? 0 };
  }

  async deleteOne(organizationId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, organization_id: organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    await this.notificationRepo.delete({ id });
    return { deleted: true };
  }

  async deleteAll(organizationId: number) {
    await this.notificationRepo.delete({ organization_id: organizationId });
    return { deleted: true };
  }
}
