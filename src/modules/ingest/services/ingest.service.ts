import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';
import { Conversation } from '../../../database/entities/conversation.entity';
import { Message } from '../../../database/entities/message.entity';
import { LeadAttribute } from '../../../database/entities/lead-attribute.entity';
import { LeadUpsertDto, LeadUpsertResponseDto } from '../dto/lead-upsert.dto';
import { LeadAttributeDto } from '../dto/lead-attribute.dto';
import { MessageDto } from '../dto/message.dto';
import { IdResolverService } from './id-resolver.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(LeadAttribute)
    private readonly leadAttributeRepository: Repository<LeadAttribute>,
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
      let conversation: Conversation | null = null;

      // Primeiro, tentar encontrar por app + conversation_id
      if (dto.app && dto.conversation_id) {
        conversation = await manager.findOne(Conversation, {
          where: {
            organization_id: organizationId,
            app: dto.app,
            conversation_id: dto.conversation_id,
          },
          relations: ['lead'],
        });

        if (conversation) {
          lead = conversation.lead;
          this.logger.log(
            `Found existing lead ${lead.id} by conversation ${dto.conversation_id}`,
          );
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
          this.logger.log(`Found existing lead ${lead.id} by phone ${dto.phone}`);
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
        });

        lead = await manager.save(Lead, lead);
        created = true;
        this.logger.log(`Created new lead ${lead.id} for phone ${dto.phone}`);
      }

      // Criar ou atualizar conversa se necessário
      if (!conversation && (dto.app || dto.conversation_id || dto.channel)) {
        conversation = await manager.findOne(Conversation, {
          where: {
            organization_id: organizationId,
            lead_id: lead.id,
            channel: dto.channel || dto.source,
            ...(dto.app && { app: dto.app }),
            ...(dto.conversation_id && { conversation_id: dto.conversation_id }),
          },
        });

        if (!conversation) {
          conversation = manager.create(Conversation, {
            organization_id: organizationId,
            lead_id: lead.id,
            channel: dto.channel || dto.source,
            app: dto.app,
            conversation_id: dto.conversation_id,
          });

          conversation = await manager.save(Conversation, conversation);
          this.logger.log(`Created conversation ${conversation.id} for lead ${lead.id}`);
        }
      }

      return {
        lead_id: lead.id,
        lead_public_id: lead.public_id,
        created,
        stage: lead.stage,
        conversation_public_id: conversation?.public_id,
      };
    });
  }

  async addLeadAttribute(
    organizationId: number,
    dto: LeadAttributeDto,
  ): Promise<void> {
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

    this.logger.log(
      `Added attribute ${dto.key}=${dto.value} to lead ${leadId}`,
    );
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
      let conversation = await manager.findOne(Conversation, {
        where: {
          organization_id: organizationId,
          lead_id: lead.id,
          channel: dto.channel || 'whatsapp',
          ...(dto.app && { app: dto.app }),
          ...(dto.conversation_id && { conversation_id: dto.conversation_id }),
        },
      });

      if (!conversation) {
        conversation = manager.create(Conversation, {
          organization_id: organizationId,
          lead_id: lead.id,
          channel: dto.channel || 'whatsapp',
          app: dto.app,
          conversation_id: dto.conversation_id,
        });

        conversation = await manager.save(Conversation, conversation);
        this.logger.log(`Created conversation ${conversation.id} for message`);
      }

      // Criar mensagem
      const messageTimestamp = dto.ts ? new Date(dto.ts) : new Date();

      const message = manager.create(Message, {
        organization_id: organizationId,
        conversation_id: conversation.id,
        direction: dto.direction,
        type: dto.type,
        payload: dto.payload,
        created_at: messageTimestamp,
      });

      await manager.save(Message, message);

      // Atualizar timestamps da conversa
      await manager.update(Conversation, conversation.id, {
        last_message_at: messageTimestamp,
      });

      // Atualizar timestamps do lead
      const updateData: any = {
        last_message_at: messageTimestamp,
      };

      // Se for a primeira resposta da equipe, marcar first_response_at
      if (dto.direction === 'out' && !lead.first_response_at) {
        updateData.first_response_at = messageTimestamp;
        this.logger.log(`First response recorded for lead ${lead.id}`);
      }

      await manager.update(Lead, lead.id, updateData);

      this.logger.log(
        `Added ${dto.direction} message (${dto.type}) to conversation ${conversation.id}`,
      );
    });
  }
}