import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { ChatMessage } from '../../../database/entities/chat-message.entity';
import { LeadAttribute } from '../../../database/entities/lead-attribute.entity';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { LeadAttributeDto } from '../dto/lead-attribute.dto';
import { MessageDto } from '../dto/message.dto';
import { IdResolverService } from './id-resolver.service';
import { Service } from '../../../database/entities/service.entity';
import { LeadServiceLink } from '../../../database/entities/lead-service-link.entity';
import { LeadServiceEvent } from '../../../database/entities/lead-service-event.entity';
import { LeadServiceDto } from '../dto/lead-service.dto';

@Injectable()
export class IngestService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadAttribute)
    private readonly leadAttributeRepository: Repository<LeadAttribute>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(LeadServiceLink)
    private readonly leadServiceLinkRepository: Repository<LeadServiceLink>,
    @InjectRepository(LeadServiceEvent)
    private readonly leadServiceEventRepository: Repository<LeadServiceEvent>,
    private readonly idResolverService: IdResolverService,
    private readonly dataSource: DataSource,
  ) {}

  async upsertLead(
    organizationId: number,
    dto: LeadUpsertDto,
  ): Promise<LeadUpsertResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      let lead: Lead | null = null;
      let created = false;
      let updated = false;
      let chat: Chat | null = null;

      // Primeiro, tentar encontrar por app + conversation_id
      if (dto.app && dto.conversation_id) {
        chat = await manager.findOne(Chat, {
          where: {
            organization_id: organizationId,
            app: dto.app,
            conversation_id: dto.conversation_id,
          },
          relations: ['lead'],
        });

        if (chat) {
          lead = chat.lead;
        }
      }

      // Se não encontrou por conversa, tentar por telefone
      if (!lead && dto.phone) {
        lead = await manager.findOne(Lead, {
          where: {
            organization_id: organizationId,
            phone: dto.phone,
          },
        });

        if (lead) {
        }
      }

      // Se não encontrou, criar novo lead
      if (!lead) {
        lead = manager.create(Lead, {
          organization_id: organizationId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          source: dto.source,
          stage: 'new',
          first_contact_at: new Date(),
          last_contact_at: new Date(),
        });

        lead = await manager.save(Lead, lead);
        created = true;
      } else {
        // Atualizar campos básicos se informados (idempotente)
        const patch: any = {
          last_contact_at: new Date(),
        };
        if (dto.name && dto.name !== lead.name) patch.name = dto.name;
        if (dto.email !== undefined && dto.email !== lead.email)
          patch.email = dto.email || null;
        if (Object.keys(patch).length > 0) {
          await manager.update(Lead, lead.id, patch);
          Object.assign(lead, patch);
          updated = true;
        }
      }

      // Criar ou atualizar conversa se necessário
      if (!chat && (dto.app || dto.conversation_id || dto.channel)) {
        chat = await manager.findOne(Chat, {
          where: {
            organization_id: organizationId,
            lead_id: lead.id,
            channel: dto.channel || dto.source,
            ...(dto.app && { app: dto.app }),
            ...(dto.conversation_id && { conversation_id: dto.conversation_id }),
          },
        });

        if (!chat) {
          chat = manager.create(Chat, {
            organization_id: organizationId,
            lead_id: lead.id,
            sub_organization_id: lead.sub_organization_id ?? null,
            channel: dto.channel || dto.source,
            app: dto.app,
            conversation_id: dto.conversation_id,
            phone: lead.phone,
          });

          chat = await manager.save(Chat, chat);
        }
      }

      return {
        lead_id: lead.id,
        lead_public_id: lead.public_id,
        created,
        updated,
        stage: lead.stage,
        conversation_public_id: chat?.public_id,
      };
    });
  }

  async addLeadAttribute(
    organizationId: number,
    dto: LeadAttributeDto,
  ): Promise<void> {
    // Compat: se a chave indicar serviço, redirecionar para lead-service
    const serviceKeys = new Set(['servico_desejado','servico_interesse','service','service_slug']);
    if (serviceKeys.has(dto.key)) {
      const lsDto: LeadServiceDto = {
        lead_public_id: dto.lead_public_id,
        lead_id: dto.lead_id,
        service_slug: dto.value,
        relation: dto.key === 'servico_interesse' ? 'interested' : 'desired',
        source: dto.source || 'attribute_compat',
      };
      await this.addLeadService(organizationId, lsDto);
      return;
    }
    const leadId = await this.idResolverService.resolveLeadId(
      organizationId,
      dto.lead_public_id,
      dto.lead_id,
    );

    const attribute = this.leadAttributeRepository.create({
      organization_id: organizationId,
      lead_id: leadId,
      key: dto.key,
      value: dto.value,
      source: dto.source,
    });

    await this.leadAttributeRepository.save(attribute);

    // Opcional: refletir atributos canônicos no lead principal
    if (dto.key === 'name' || dto.key === 'nome') {
      await this.leadRepository.update(leadId, { name: dto.value });
    }
    if (dto.key === 'email') {
      await this.leadRepository.update(leadId, { email: dto.value });
    }

  }

  /**
   * Registrar mensagem e atualizar timestamps
   */
  async addMessage(organizationId: number, dto: MessageDto): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const lead = await this.idResolverService.getLead(
        organizationId,
        dto.lead_public_id,
        dto.lead_id,
      );

      // Encontrar ou criar conversa
      let chat = await manager.findOne(Chat, {
        where: {
          organization_id: organizationId,
          lead_id: lead.id,
          channel: dto.channel || 'whatsapp',
          ...(dto.app && { app: dto.app }),
          ...(dto.conversation_id && { conversation_id: dto.conversation_id }),
        },
      });

      if (!chat) {
        chat = manager.create(Chat, {
          organization_id: organizationId,
          lead_id: lead.id,
          sub_organization_id: lead.sub_organization_id ?? null,
          channel: dto.channel || 'whatsapp',
          app: dto.app,
          conversation_id: dto.conversation_id,
          phone: lead.phone,
        });

        chat = await manager.save(Chat, chat);
      }

      // Criar mensagem
      const messageTimestamp = dto.ts ? new Date(dto.ts) : new Date();

      const message = manager.create(ChatMessage, {
        organization_id: organizationId,
        chat_id: chat.id,
        lead_id: lead.id,
        conversation_id: chat.conversation_id ?? null,
        direction: dto.direction as 'in' | 'out' | 'system',
        message_type: dto.type,
        payload: dto.payload,
        bot_message: dto.direction === 'out' ? (dto.payload?.text ?? null) : null,
        user_message: dto.direction === 'in' ? (dto.payload?.text ?? null) : null,
        phone: chat.phone ?? lead.phone ?? null,
        data: dto.payload ? JSON.stringify(dto.payload) : null,
        sent_at: messageTimestamp,
      });

      await manager.save(ChatMessage, message);

      // Atualizar timestamps da conversa
      await manager.update(Chat, chat.id, {
        last_message_at: messageTimestamp,
      });

      // Atualizar timestamps do lead
      const updateData: any = {
        last_message_at: messageTimestamp,
        last_contact_at: messageTimestamp,
      };

      // Se for a primeira resposta da equipe, marcar first_response_at
      if (dto.direction === 'out' && !lead.first_response_at) {
        updateData.first_response_at = messageTimestamp;
      }

      if (dto.direction === 'in' && !lead.first_contact_at) {
        updateData.first_contact_at = messageTimestamp;
      }

      await manager.update(Lead, lead.id, updateData);

    });
  }

  /**
   * Vincular um serviço a um lead, resolvendo service por slug/title/public_id
   */
  async addLeadService(organizationId: number, dto: LeadServiceDto): Promise<void> {
    const leadId = await this.idResolverService.resolveLeadId(
      organizationId,
      dto.lead_public_id,
      dto.lead_id,
    );

    // Resolver service
    let service: Service | null = null;
    if (dto.service_public_id) {
      service = await this.serviceRepository.findOne({ where: { public_id: dto.service_public_id, organization_id: organizationId } });
    }
    if (!service && dto.service_slug) {
      service = await this.serviceRepository.findOne({ where: { slug: dto.service_slug, organization_id: organizationId } });
    }
    if (!service && dto.service_title) {
      service = await this.serviceRepository.findOne({ where: { title: dto.service_title, organization_id: organizationId } });
    }
    if (!service) {
      throw new NotFoundException('Service not found for provided identifiers');
    }

    const relation = dto.relation || 'desired';

    // Upsert link
    const existing = await this.leadServiceLinkRepository.findOne({ where: {
      organization_id: organizationId,
      lead_id: leadId,
      service_id: service.id,
      relation,
    }});

    if (existing) {
      // update timestamp and source
      existing.source = dto.source || existing.source;
      existing.ts = new Date();
      await this.leadServiceLinkRepository.save(existing);
    } else {
      await this.leadServiceLinkRepository.save({
        organization_id: organizationId,
        lead_id: leadId,
        service_id: service.id,
        relation,
        source: dto.source || null,
      });
    }

    // Append a historical event into lead_service_events (append-only)
    await this.leadServiceEventRepository.save({
      organization_id: organizationId,
      lead_id: leadId,
      service_id: service.id,
      relation,
      source: dto.source || 'lead_service',
    });
  }

}
