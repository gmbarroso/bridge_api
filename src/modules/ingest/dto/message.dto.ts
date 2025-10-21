import { IsString, IsOptional, IsUUID, IsNumber, IsObject, IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MessageDto {
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
    description: 'Message direction',
    example: 'in',
    enum: ['in', 'out'],
  })
  @IsString()
  @IsIn(['in', 'out'], { message: 'direction must be either "in" or "out"' })
  direction: string;

  @ApiProperty({
    description: 'Message type',
    example: 'text',
    enum: ['text', 'image', 'doc', 'audio', 'video', 'location', 'contact'],
  })
  @IsString()
  @IsIn(['text', 'image', 'doc', 'audio', 'video', 'location', 'contact'])
  type: string;

  @ApiProperty({
    description: 'Message payload/content',
    example: { text: 'Quero cortar amanhã' },
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({
    description: 'Communication channel',
    example: 'whatsapp',
    default: 'whatsapp',
  })
  @IsOptional()
  @IsString()
  channel?: string;

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
    description: 'Message timestamp (ISO 8601)',
    example: '2025-10-21T18:05:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'ts must be a valid ISO 8601 date string' })
  ts?: string;
}