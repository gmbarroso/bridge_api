import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeadUpsertDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+5521999999999',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Contact name',
    example: 'Contato WhatsApp',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'contato@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Lead source',
    example: 'whatsapp',
    enum: ['whatsapp', 'instagram', 'site', 'facebook', 'telegram'],
  })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Application name',
    example: 'evolution',
    required: false,
  })
  @IsOptional()
  @IsString()
  app?: string;

  @ApiProperty({
    description: 'External conversation ID',
    example: 'abc-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversation_id?: string;

  @ApiProperty({
    description: 'Channel for communication',
    example: 'whatsapp',
    default: 'whatsapp',
  })
  @IsOptional()
  @IsString()
  channel?: string;
}

export class LeadUpsertResponseDto {
  @ApiProperty({
    description: 'Internal lead ID',
    example: 915,
  })
  lead_id: number;

  @ApiProperty({
    description: 'Public UUID for the lead',
    example: 'a0f9fbd5-0a0e-4f05-9b21-5a2d5f4f8a4f',
  })
  lead_public_id: string;

  @ApiProperty({
    description: 'Whether the lead was newly created',
    example: true,
  })
  created: boolean;

  @ApiProperty({
    description: 'Current lead stage',
    example: 'new',
  })
  stage: string;

  @ApiProperty({
    description: 'Conversation public ID if created/found',
    example: 'b1f9fbd5-0a0e-4f05-9b21-5a2d5f4f8a4f',
    required: false,
  })
  conversation_public_id?: string;
}