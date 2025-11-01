import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LeadUpsertDto {
  @ApiProperty({
    description: 'Unique session identifier for the contact. Used across all tables.',
    example: 'session-01HZY9Q3CH9R9',
  })
  @IsString()
  @Length(1, 255)
  session_id!: string;

  @ApiProperty({
    description: 'Optional conversation identifier (defaults to session_id).',
    example: 'session-01HZY9Q3CH9R9',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversation_id?: string;

  @ApiProperty({
    description: 'Lead type. Define se o registro é pessoa física (`person`) ou jurídica (`corporate`).',
    enum: ['person', 'corporate'],
    default: 'person',
    required: false,
  })
  @IsOptional()
  @IsIn(['person', 'corporate'])
  kind?: 'person' | 'corporate';

  @ApiProperty({
    description: 'Phone number in international format.',
    example: '+5521999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Contact name (for person leads).',
    example: 'João da Silva',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Company name (for corporate leads).',
    example: 'Bridge Tecnologia',
    required: false,
  })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiProperty({
    description: 'Email address.',
    example: 'contato@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Document/identifier.',
    example: '123.456.789-00',
    required: false,
  })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({
    description: 'Lead source. Defaults to whatsapp.',
    example: 'whatsapp',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Application name responsible for the conversation.',
    example: 'evolution',
    required: false,
  })
  @IsOptional()
  @IsString()
  app?: string;

  @ApiProperty({
    description: 'Communication channel (whatsapp, instagram, etc).',
    example: 'whatsapp',
    required: false,
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({
    description: 'Display name received from the channel (pushName).',
    example: 'João 🧔🏻‍♂️',
    required: false,
  })
  @IsOptional()
  @IsString()
  pushName?: string;

  @ApiProperty({
    description: 'Service requested (text field).',
    example: 'corte-feminino',
    required: false,
  })
  @IsOptional()
  @IsString()
  servico?: string;

  @ApiProperty({
    description: 'Quantidade de colaboradores da empresa.',
    example: 25,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  colaboradores?: number;

  @ApiProperty({
    description: 'Tipo de cliente (ex.: MEI, PME, Enterprise).',
    example: 'PME',
    required: false,
  })
  @IsOptional()
  @IsString()
  tipo_cliente?: string;

  @ApiProperty({
    description: 'Cargo do contato principal.',
    example: 'Diretor Comercial',
    required: false,
  })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiProperty({
    description: 'Nome da empresa (quando diferente de company_name).',
    example: 'Bridge Tecnologia LTDA',
    required: false,
  })
  @IsOptional()
  @IsString()
  empresa?: string;

  @ApiProperty({
    description: 'Nome agendado para o atendimento.',
    example: 'Reunião com João Silva',
    required: false,
  })
  @IsOptional()
  @IsString()
  nome_agendado?: string;

  @ApiProperty({
    description: 'CPF ou CNPJ do cliente.',
    example: '12.345.678/0001-99',
    required: false,
  })
  @IsOptional()
  @IsString()
  cpf_cnpj?: string;

  @ApiProperty({
    description: 'Custom consent flags.',
    example: { marketing: true },
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  consents?: Record<string, any>;

  @ApiProperty({
    description: 'Extra attributes to merge with current payload.',
    example: { bairro: 'Centro' },
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  extra_attributes?: Record<string, any>;

  @ApiProperty({
    description: 'Tags to append to lead.',
    example: ['vip', 'smoke-test'],
    required: false,
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class LeadUpsertResponseDto {
  @ApiProperty({ description: 'Internal identifier.', example: 42 })
  lead_id!: number;

  @ApiProperty({ description: 'Public UUID.', example: 'a0f9fbd5-0a0e-4f05-9b21-5a2d5f4f8a4f' })
  lead_public_id!: string;

  @ApiProperty({ description: 'Session identifier used as correlation id.', example: 'session-01HZY9Q3CH9R9' })
  session_id!: string;

  @ApiProperty({ description: 'Lead type that was persisted.', example: 'person' })
  kind!: 'person' | 'corporate';

  @ApiProperty({ description: 'Lead stage after upsert.', example: 'new' })
  stage!: string;

  @ApiProperty({ description: 'Flag indicating if a new lead was created.', example: true })
  created!: boolean;

  @ApiProperty({ description: 'Flag indicating if an existing lead was updated.', example: false })
  updated!: boolean;

  @ApiProperty({
    description: 'Conversation public UUID associated with the session.',
    example: 'b1f9fbd5-0a0e-4f05-9b21-5a2d5f4f8a4f',
    required: false,
  })
  conversation_public_id?: string;
}
