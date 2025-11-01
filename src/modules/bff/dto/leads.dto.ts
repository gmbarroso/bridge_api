import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
    description: 'Text search (matches name, phone or session_id)',
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
}
