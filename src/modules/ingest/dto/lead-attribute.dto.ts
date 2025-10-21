import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LeadAttributeDto {
  @ApiProperty({
    description: 'Lead public UUID (preferred) or internal ID',
    example: 'a0f9fbd5-0a0e-4f05-9b21-5a2d5f4f8a4f',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'lead_public_id must be a valid UUID' })
  lead_public_id?: string;

  @ApiProperty({
    description: 'Lead internal ID (alternative to public_id)',
    example: 915,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lead_id?: number;

  @ApiProperty({
    description: 'Attribute key',
    example: 'servico_desejado',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Attribute value',
    example: 'Barba e Cabelo',
    required: false,
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({
    description: 'Source of the attribute',
    example: 'fluxo_whatsapp',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;
}