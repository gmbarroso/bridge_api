import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class MessageDto {
  @ApiProperty({
    description: 'Conversation identifier. Falls back to session_id when omitted.',
    example: 'session-01HZY9Q3CH9R9',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversation_id?: string;

  @ApiProperty({
    description: 'Session identifier (required if conversation_id is missing).',
    example: 'session-01HZY9Q3CH9R9',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  session_id?: string;

  @ApiProperty({
    description: 'Direction of the message.',
    enum: ['in', 'out'],
    example: 'in',
  })
  @IsIn(['in', 'out'])
  direction!: 'in' | 'out';

  @ApiProperty({
    description: 'Message type (text, image, audio, etc).',
    example: 'text',
    required: false,
    default: 'text',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Message payload (stored as JSON string).',
    example: { text: 'Preciso de horário amanhã' },
  })
  @IsObject()
  payload!: Record<string, any>;

  @ApiProperty({
    description: 'Channel (whatsapp, instagram...).',
    example: 'whatsapp',
    required: false,
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({
    description: 'Application name generating the message.',
    example: 'evolution',
    required: false,
  })
  @IsOptional()
  @IsString()
  app?: string;

  @ApiProperty({
    description: 'Phone associated with the message.',
    example: '+5521999999999',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Message timestamp (ISO 8601). Defaults to now.',
    example: '2025-10-31T01:06:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  ts?: string;
}
