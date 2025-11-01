import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ChatMessage } from '../../../database/entities/chat-message.entity';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { MessageDto } from '../dto/message.dto';

type LeadKind = 'person' | 'corporate';

@Injectable()
export class IngestService {
  constructor(private readonly dataSource: DataSource) {}

  async upsertLead(organizationId: number, dto: LeadUpsertDto): Promise<LeadUpsertResponseDto> {
    const sessionId = dto.session_id?.trim();
    if (!sessionId) {
      throw new BadRequestException('session_id is required');
    }

    const conversationId = (dto.conversation_id || sessionId).trim();
    const kind: LeadKind = dto.kind === 'corporate' ? 'corporate' : 'person';
    const now = new Date();

    return this.dataSource.transaction(async (manager) => {
      const leadRepo = manager.getRepository(Lead);

      let lead = await leadRepo.findOne({
        where: { organization_id: organizationId, session_id: sessionId },
      });

      let created = false;
      let updated = false;

      if (!lead) {
        lead = await leadRepo.save(
          leadRepo.create({
            organization_id: organizationId,
            session_id: sessionId,
            kind,
            source: dto.source || 'whatsapp',
            stage: 'new',
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            name: dto.name ?? null,
            company_name: dto.company_name ?? null,
            document: dto.document ?? null,
            colaboradores: dto.colaboradores ?? null,
            tipo_cliente: dto.tipo_cliente ?? null,
            cargo: dto.cargo ?? null,
            empresa: dto.empresa ?? null,
            nome_agendado: dto.nome_agendado ?? null,
            cpf_cnpj: dto.cpf_cnpj ?? null,
            pushName: dto.pushName ?? null,
            servico: dto.servico ?? null,
            first_contact_at: now,
            last_contact_at: now,
            last_message_at: null,
            first_response_at: null,
            consents: dto.consents ?? {},
            tags: dto.tags ?? [],
            extra_attributes: dto.extra_attributes ?? {},
          }),
        );
        created = true;
      } else {
        const patch: Partial<Lead> = { last_contact_at: now };

        if (lead.kind !== kind) {
          patch.kind = kind;
        }
        if (dto.name && dto.name !== lead.name) patch.name = dto.name;
        if (dto.company_name && dto.company_name !== lead.company_name) patch.company_name = dto.company_name;
        if (dto.phone && dto.phone !== lead.phone) patch.phone = dto.phone;
        if (dto.email !== undefined && dto.email !== lead.email) patch.email = dto.email ?? null;
        if (dto.source && dto.source !== lead.source) patch.source = dto.source;
        if (dto.document && dto.document !== lead.document) patch.document = dto.document;
        if (dto.colaboradores !== undefined && dto.colaboradores !== lead.colaboradores) {
          patch.colaboradores = dto.colaboradores ?? null;
        }
        if (dto.tipo_cliente && dto.tipo_cliente !== lead.tipo_cliente) patch.tipo_cliente = dto.tipo_cliente;
        if (dto.cargo && dto.cargo !== lead.cargo) patch.cargo = dto.cargo;
        if (dto.empresa && dto.empresa !== lead.empresa) patch.empresa = dto.empresa;
        if (dto.nome_agendado && dto.nome_agendado !== lead.nome_agendado) patch.nome_agendado = dto.nome_agendado;
        if (dto.cpf_cnpj && dto.cpf_cnpj !== lead.cpf_cnpj) patch.cpf_cnpj = dto.cpf_cnpj;
        if (dto.pushName && dto.pushName !== lead.pushName) patch.pushName = dto.pushName;
        if (dto.servico && dto.servico !== lead.servico) patch.servico = dto.servico;
        if (dto.consents) patch.consents = { ...(lead.consents ?? {}), ...dto.consents };
        if (dto.extra_attributes) {
          patch.extra_attributes = { ...(lead.extra_attributes ?? {}), ...dto.extra_attributes };
        }
        if (dto.tags && dto.tags.length) {
          const current = new Set<string>(lead.tags ?? []);
          dto.tags.forEach((tag) => current.add(tag));
          patch.tags = Array.from(current);
        }

        await leadRepo.update(lead.id, patch);
        Object.assign(lead, patch);
        updated = Object.keys(patch).some((key) => key !== 'last_contact_at');
      }

      const chatRepo = manager.getRepository(Chat);
      let chat = await chatRepo.findOne({
        where: { organization_id: organizationId, conversation_id: conversationId },
      });

      if (!chat) {
        chat = await chatRepo.save(
          chatRepo.create({
            organization_id: organizationId,
            sub_organization_id: lead.sub_organization_id ?? null,
            lead_id: lead.id,
            conversation_id: conversationId,
            channel: dto.channel || dto.source || 'whatsapp',
            app: dto.app ?? null,
            phone: dto.phone ?? lead.phone ?? null,
          }),
        );
      } else {
        const patch: Partial<Chat> = {};
        if (!chat.lead_id) {
          patch.lead_id = lead.id;
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
        lead_id: Number(lead.id),
        lead_public_id: lead.public_id,
        created,
        updated,
        stage: lead.stage,
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

        if (!lead) {
          throw new NotFoundException('No lead found for provided session');
        }

        chat = await chatRepo.save(
          chatRepo.create({
            organization_id: organizationId,
            sub_organization_id: lead.sub_organization_id ?? null,
            lead_id: lead.id,
            conversation_id: conversationId,
            channel: dto.channel || 'whatsapp',
            app: dto.app ?? null,
            phone: dto.phone ?? lead.phone ?? null,
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

      const leadRepo = manager.getRepository(Lead);
      const lead = await leadRepo.findOne({ where: { id: chat.lead_id ?? 0 } });
      if (!lead) {
        return;
      }

      const updatePayload: Partial<Lead> = {
        last_message_at: timestamp,
        last_contact_at: timestamp,
      };
      if (dto.direction === 'out' && !lead.first_response_at) {
        updatePayload.first_response_at = timestamp;
      }
      if (dto.direction === 'in' && !lead.first_contact_at) {
        updatePayload.first_contact_at = timestamp;
      }
      await leadRepo.update(lead.id, updatePayload);
    });
  }
}
