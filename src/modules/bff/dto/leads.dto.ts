import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListLeadsQueryDto {
  @ApiProperty({
    description: 'Filter by stage (optional)',
    example: 'new',
    required: false,
  })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiProperty({
    description: 'Text search (matches name, company_name, phone, email or session_id)',
    example: 'joao',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Maximum number of items (default 50, max 200)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor opaco para paginação (retornado no nextCursor)',
    example: 'MjAyNS0xMS0wMVQxMDozMDowMC4wMDBaMHwyNQ',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Página baseada em índice 1 (compatibilidade legacy). Ignorada se cursor for usado.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Data inicial (ISO) para filtrar por created_at',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Data final (ISO) para filtrar por created_at',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({
    description: 'Identifique o lead pela session_id (preferido).',
    example: 'session-0001',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Identificador público do lead (use quando não tiver sessionId).',
    example: 'eeea5e9f-55b8-4c81-854f-b8d568777c2d',
  })
  @IsOptional()
  @IsString()
  leadPublicId?: string;

  @ApiPropertyOptional({ description: 'Nome (PF)', example: 'Maria' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Nome da empresa (PJ)', example: 'Bridge Tecnologia LTDA' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Telefone', example: '+55 11 99888-0001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'lead@bridge.dev' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Stage do lead', example: 'qualified' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Tipo do lead', enum: ['person', 'corporate'] })
  @IsOptional()
  @IsString()
  kind?: 'person' | 'corporate';

  @ApiPropertyOptional({ description: 'Documento', example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'Serviço desejado', example: 'corte-feminino' })
  @IsOptional()
  @IsString()
  servico?: string;

  @ApiPropertyOptional({ description: 'Número de colaboradores (PJ)', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  colaboradores?: number;

  @ApiPropertyOptional({ description: 'Tipo de cliente (PJ)', example: 'PME' })
  @IsOptional()
  @IsString()
  tipoCliente?: string;

  @ApiPropertyOptional({ description: 'Cargo do contato', example: 'Diretor Comercial' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ description: 'Empresa associada', example: 'Bridge Tecnologia' })
  @IsOptional()
  @IsString()
  empresa?: string;

  @ApiPropertyOptional({ description: 'Nome agendado', example: 'Reunião com João' })
  @IsOptional()
  @IsString()
  nomeAgendado?: string;

  @ApiPropertyOptional({ description: 'CPF/CNPJ', example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;
}

export class CreateLeadDto {
  @ApiPropertyOptional({
    description: 'session_id único do lead. Se não for enviado, será gerado automaticamente.',
    example: 'session-0001',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Nome (PF)', example: 'Maria' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Nome da empresa (PJ)', example: 'Bridge Tecnologia LTDA' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Telefone', example: '+55 11 99888-0001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'lead@bridge.dev' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Stage do lead', example: 'new' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Tipo do lead', enum: ['person', 'corporate'] })
  @IsOptional()
  @IsString()
  kind?: 'person' | 'corporate';

  @ApiPropertyOptional({ description: 'Documento', example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'Serviço desejado', example: 'corte-feminino' })
  @IsOptional()
  @IsString()
  servico?: string;

  @ApiPropertyOptional({ description: 'Número de colaboradores (PJ)', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  colaboradores?: number;

  @ApiPropertyOptional({ description: 'Tipo de cliente (PJ)', example: 'PME' })
  @IsOptional()
  @IsString()
  tipoCliente?: string;

  @ApiPropertyOptional({ description: 'Cargo do contato', example: 'Diretor Comercial' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ description: 'Empresa associada', example: 'Bridge Tecnologia' })
  @IsOptional()
  @IsString()
  empresa?: string;

  @ApiPropertyOptional({ description: 'Nome agendado', example: 'Reunião com João' })
  @IsOptional()
  @IsString()
  nomeAgendado?: string;

  @ApiPropertyOptional({ description: 'CPF/CNPJ', example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;
}
