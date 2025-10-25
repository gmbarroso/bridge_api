import { Body, ConflictException, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiParam, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../../../database/entities/service.entity';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ErrorResponse } from '../../../common/swagger/errors';

@ApiTags('Admin - Services')
@ApiExtraModels(ErrorResponse)
@Controller('admin/services')
export class ServicesAdminController {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  @Post('organization/:organizationId')
  @ApiOperation({ summary: 'Criar serviço para uma organização' })
  @ApiParam({ name: 'organizationId', type: Number, description: 'ID da organização' })
  @ApiBody({ type: CreateServiceDto, examples: {
    basic: { summary: 'Serviço de exemplo', value: {
      slug: 'corte-feminino',
      title: 'Corte Feminino',
      category: 'beleza',
      audience: 'adulto',
      service_type: 'servico',
      tags: ['cabelo','feminino'],
      status: 'active'
    }}
  }})
  @ApiResponse({ status: 201, description: 'Serviço criado', schema: { example: { public_id: '11111111-1111-4111-8111-111111111111', slug: 'corte-feminino', title: 'Corte Feminino', category: 'beleza', audience: 'adulto', service_type: 'servico', status: 'active' } } })
  @ApiResponse({ status: 409, description: 'Slug já existe para esta organização', schema: { $ref: getSchemaPath(ErrorResponse) } })
  async create(
    @Param('organizationId') organizationId: number,
    @Body() dto: CreateServiceDto,
  ) {
    const existing = await this.serviceRepo.findOne({ where: { organization_id: organizationId, slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Slug já existe para esta organização');
    }

    const created = await this.serviceRepo.save({
      organization_id: Number(organizationId),
      suborganization_id: null,
      slug: dto.slug,
      title: dto.title,
      category: dto.category,
      audience: dto.audience,
      service_type: dto.service_type,
      tags: dto.tags ?? [],
      source_url: dto.source_url ?? null,
      content: dto.content ?? null,
      status: dto.status ?? 'active',
    });

    return {
      public_id: created.public_id,
      slug: created.slug,
      title: created.title,
      category: created.category,
      audience: created.audience,
      service_type: created.service_type,
      status: created.status,
    };
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Listar serviços da organização' })
  @ApiParam({ name: 'organizationId', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de serviços', schema: { example: [ { public_id: '...', slug: 'corte-feminino', title: 'Corte Feminino', status: 'active' } ] } })
  async list(@Param('organizationId') organizationId: number) {
    const rows = await this.serviceRepo.find({ where: { organization_id: Number(organizationId) }, order: { created_at: 'DESC' } });
    return rows.map(r => ({ public_id: r.public_id, slug: r.slug, title: r.title, status: r.status }));
  }
}
