import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { CorporateLead } from '../../../database/entities/corporate-lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ChatMessage } from '../../../database/entities/chat-message.entity';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { MessageDto } from '../dto/message.dto';

type LeadKind = 'person' | 'corporate';

@Injectable()
export class IngestService {
  constructor(private readonly dataSource: DataSource) {}

  private getLeadRepo(kind: LeadKind, manager = this.dataSource.manager) {
    return kind === 'corporate'
      ? manager.getRepository(CorporateLead)
      : manager.getRepository(Lead);
  }

  async upsertLead(organizationId: number, dto: LeadUpsertDto): Promise<LeadUpsertResponseDto> {
    const sessionId = dto.session_id?.trim();
    if (!sessionId) {
      throw new BadRequestException('session_id is required');
    }

    const conversationId = (dto.conversation_id || sessionId).trim();
    const kind: LeadKind = dto.kind === 'corporate' ? 'corporate' : 'person';
    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      const leadRepo = this.getLeadRepo(kind, manager) as Repository<any>;

      let lead: any = await leadRepo.findOne({
        where: { organization_id: organizationId, session_id: sessionId },
      });

      let created = false;
      let updated = false;

      if (!lead) {
        const base: any = {
          organization_id: organizationId,
          session_id: sessionId,
          source: dto.source || 'whatsapp',
          stage: 'new',
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          first_contact_at: now,
          last_contact_at: now,
          last_message_at: null,
          first_response_at: null,
          consents: dto.consents ?? {},
          tags: dto.tags ?? [],
          extra_attributes: dto.extra_attributes ?? {},
        };

        if (kind === 'person') {
          base.name = dto.name ?? null;
          base.document = dto.document ?? null;
          base.pushName = dto.pushName ?? null;
          base.servico = dto.servico ?? null;
        } else {
          base.company_name = dto.company_name ?? null;
          base.document = dto.document ?? null;
        }

        lead = await leadRepo.save(leadRepo.create(base));
        created = true;
      } else {
        const patch: any = { last_contact_at: now };
        if (dto.phone && dto.phone !== (lead as any).phone) patch.phone = dto.phone;
        if (dto.email !== undefined && dto.email !== (lead as any).email) patch.email = dto.email ?? null;
        if (dto.source && dto.source !== (lead as any).source) patch.source = dto.source;
        if (dto.name && kind === 'person' && dto.name !== (lead as any).name) patch.name = dto.name;
        if (dto.company_name && kind === 'corporate' && dto.company_name !== (lead as any).company_name) {
          patch.company_name = dto.company_name;
        }
        if (dto.document && dto.document !== (lead as any).document) patch.document = dto.document;
        if (dto.pushName && kind === 'person' && dto.pushName !== (lead as any).pushName) patch.pushName = dto.pushName;
        if (dto.servico && kind === 'person' && dto.servico !== (lead as any).servico) patch.servico = dto.servico;
        if (dto.consents) patch.consents = { ...(lead as any).consents, ...dto.consents };
        if (dto.extra_attributes) {
          patch.extra_attributes = { ...(lead as any).extra_attributes, ...dto.extra_attributes };
        }
        if (dto.tags && dto.tags.length) {
          const existing = new Set<string>((lead as any).tags ?? []);
          for (const tag of dto.tags) existing.add(tag);
          patch.tags = Array.from(existing);
        }

        await leadRepo.update((lead as any).id, patch);
        Object.assign(lead, patch);
        updated = Object.keys(patch).some((key) => key !== 'last_contact_at');
      }

      // Ensure chat exists and points to this lead
      const chatRepo = manager.getRepository(Chat);
      let chat = await chatRepo.findOne({
        where: { organization_id: organizationId, conversation_id: conversationId },
      });

      if (!chat) {
        const chatPayload = chatRepo.create({
          organization_id: organizationId,
          sub_organization_id: (lead as any).sub_organization_id ?? null,
          lead_id: kind === 'person' ? (lead as any).id : null,
          corporate_lead_id: kind === 'corporate' ? (lead as any).id : null,
          conversation_id: conversationId,
          channel: dto.channel || dto.source || 'whatsapp',
          app: dto.app ?? null,
          phone: dto.phone ?? (lead as any).phone ?? null,
        });
        chat = await chatRepo.save(chatPayload);
      } else {
        const patch: Partial<Chat> = {};
        if (kind === 'person' && !chat.lead_id) {
          patch.lead_id = (lead as any).id;
        }
        if (kind === 'corporate' && !chat.corporate_lead_id) {
          patch.corporate_lead_id = (lead as any).id;
        }
        if (dto.channel && dto.channel !== chat.channel) patch.channel = dto.channel;
        if (dto.app && dto.app !== chat.app) patch.app = dto.app;
        if (dto.phone && !chat.phone) patch.phone = dto.phone;
        if (Object.keys(patch).length) {
          await chatRepo.update(chat.id, patch);
          Object.assign(chat, patch);
        }
      }

      return {
        lead_id: Number((lead as any).id),
        lead_public_id: (lead as any).public_id,
        created,
        updated,
        stage: (lead as any).stage,
        conversation_public_id: chat?.public_id,
        session_id: sessionId,
        kind,
      };
    });
  }

  async addMessage(organizationId: number, dto: MessageDto): Promise<void> {
    const sessionOrConversation = dto.conversation_id || dto.session_id;
    if (!sessionOrConversation) {
      throw new BadRequestException('conversation_id or session_id must be provided');
    }
    const conversationId = sessionOrConversation.trim();
    const timestamp = dto.ts ? new Date(dto.ts) : new Date();

    await this.dataSource.transaction(async (manager) => {
      const chatRepo = manager.getRepository(Chat);
      let chat = await chatRepo.findOne({
        where: { organization_id: organizationId, conversation_id: conversationId },
      });

      if (!chat) {
        const lead = await manager.getRepository(Lead).findOne({
          where: { organization_id: organizationId, session_id: conversationId },
        });
        const corporateLead = lead
          ? null
          : await manager.getRepository(CorporateLead).findOne({
              where: { organization_id: organizationId, session_id: conversationId },
            });

        if (!lead && !corporateLead) {
          throw new NotFoundException('No lead or corporate lead found for provided session');
        }

        chat = await chatRepo.save(
          chatRepo.create({
            organization_id: organizationId,
            sub_organization_id: (lead ?? corporateLead)?.sub_organization_id ?? null,
            lead_id: lead ? lead.id : null,
            corporate_lead_id: corporateLead ? corporateLead.id : null,
            conversation_id: conversationId,
            channel: dto.channel || 'whatsapp',
            app: dto.app ?? null,
            phone: dto.phone ?? lead?.phone ?? corporateLead?.phone ?? null,
          }),
        );
      }

      const messageRepo = manager.getRepository(ChatMessage);
      const message = messageRepo.create({
        conversation_id: conversationId,
        message_type: dto.type || 'text',
        bot_message: dto.direction === 'out' ? dto.payload?.text ?? null : null,
        user_message: dto.direction === 'in' ? dto.payload?.text ?? null : null,
        phone: dto.phone ?? chat.phone ?? null,
        active: true,
        data: dto.payload ? JSON.stringify(dto.payload) : null,
        sent_at: timestamp,
      });
      await messageRepo.save(message);

      await chatRepo.update(chat.id, {
        last_message_at: timestamp,
        phone: chat.phone ?? dto.phone ?? null,
      });

      const updatePayload: any = {
        last_message_at: timestamp,
        last_contact_at: timestamp,
      };

      if (dto.direction === 'out') {
        updatePayload.first_response_at = timestamp;
      }
      if (dto.direction === 'in') {
        updatePayload.first_contact_at = timestamp;
      }

      if (chat.lead_id) {
        const leadRepo = manager.getRepository(Lead);
        const lead = await leadRepo.findOne({ where: { id: chat.lead_id } });
        if (lead) {
          if (lead.first_response_at && dto.direction === 'out') {
            delete updatePayload.first_response_at;
          }
          if (lead.first_contact_at && dto.direction === 'in') {
            delete updatePayload.first_contact_at;
          }
          await leadRepo.update(chat.lead_id, updatePayload);
        }
      } else if (chat.corporate_lead_id) {
        const corpRepo = manager.getRepository(CorporateLead);
        const corp = await corpRepo.findOne({ where: { id: chat.corporate_lead_id } });
        if (corp) {
          if (corp.first_response_at && dto.direction === 'out') {
            delete updatePayload.first_response_at;
          }
          if (corp.first_contact_at && dto.direction === 'in') {
            delete updatePayload.first_contact_at;
          }
          await corpRepo.update(chat.corporate_lead_id, updatePayload);
        }
      }
    });
  }
}
