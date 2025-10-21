import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../../../database/entities/lead.entity';

@Injectable()
export class IdResolverService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async resolveLeadId(
    organizationId: number,
    leadPublicId?: string,
    leadId?: number,
  ): Promise<number> {
    if (!leadPublicId && !leadId) {
      throw new NotFoundException('Either lead_public_id or lead_id must be provided');
    }

    let lead: Lead | null = null;

    if (leadPublicId) {
      lead = await this.leadRepository.findOne({
        where: {
          public_id: leadPublicId,
          organization_id: organizationId,
        },
      });
    } else if (leadId) {
      lead = await this.leadRepository.findOne({
        where: {
          id: leadId,
          organization_id: organizationId,
        },
      });
    }

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead.id;
  }

  async getLead(
    organizationId: number,
    leadPublicId?: string,
    leadId?: number,
  ): Promise<Lead> {
    if (!leadPublicId && !leadId) {
      throw new NotFoundException('Either lead_public_id or lead_id must be provided');
    }

    let lead: Lead | null = null;

    if (leadPublicId) {
      lead = await this.leadRepository.findOne({
        where: {
          public_id: leadPublicId,
          organization_id: organizationId,
        },
      });
    } else if (leadId) {
      lead = await this.leadRepository.findOne({
        where: {
          id: leadId,
          organization_id: organizationId,
        },
      });
    }

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }
}