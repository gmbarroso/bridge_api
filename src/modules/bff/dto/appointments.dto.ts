import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type AppointmentStatus = 'scheduled' | 'canceled' | 'done' | 'no_show';

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra compromissos a partir desta data/hora (ISO). Comparação em start_time.',
    example: '2025-01-15T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filtra compromissos até esta data/hora (ISO). Comparação em start_time.',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Status do agendamento.',
    enum: ['scheduled', 'canceled', 'done', 'no_show'],
    example: 'scheduled',
  })
  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'canceled', 'done', 'no_show'])
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filtra por lead_id.',
    example: 123,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leadId?: number;

  @ApiPropertyOptional({
    description: 'Página (base 1).',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por página (padrão 20, máx 200).',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Lead relacionado ao agendamento.', example: 123 })
  @Type(() => Number)
  @IsInt()
  leadId!: number;

  @ApiProperty({
    description: 'Início do agendamento em ISO/UTC.',
    example: '2025-02-01T14:00:00.000Z',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    description: 'Fim do agendamento em ISO/UTC.',
    example: '2025-02-01T15:00:00.000Z',
  })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ description: 'Serviço. Default: servico do lead.', example: 'corte-feminino' })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: 'Status do compromisso (default scheduled).',
    enum: ['scheduled', 'canceled', 'done', 'no_show'],
    example: 'scheduled',
  })
  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'canceled', 'done', 'no_show'])
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Notas opcionais', example: 'Trazer exames recentes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Início do agendamento em ISO/UTC.',
    example: '2025-02-01T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Fim do agendamento em ISO/UTC.',
    example: '2025-02-01T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Serviço associado.', example: 'corte-feminino' })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: 'Status do compromisso.',
    enum: ['scheduled', 'canceled', 'done', 'no_show'],
    example: 'done',
  })
  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'canceled', 'done', 'no_show'])
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Notas opcionais', example: 'Cliente pediu reagendamento' })
  @IsOptional()
  @IsString()
  notes?: string;
}
