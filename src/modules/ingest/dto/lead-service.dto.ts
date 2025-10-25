import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class LeadServiceDto {
  @ApiProperty({ required: false, description: 'Lead public UUID' })
  @IsOptional()
  @IsUUID('4')
  lead_public_id?: string;

  @ApiProperty({ required: false, description: 'Lead internal ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lead_id?: number;

  @ApiProperty({ required: false, description: 'Service public UUID' })
  @IsOptional()
  @IsUUID('4')
  service_public_id?: string;

  @ApiProperty({ required: false, description: 'Service slug (preferido)' })
  @IsOptional()
  @IsString()
  service_slug?: string;

  @ApiProperty({ required: false, description: 'Service title (fallback)' })
  @IsOptional()
  @IsString()
  service_title?: string;

  @ApiProperty({ required: false, default: 'desired', enum: ['interested','desired','purchased','recommended'] })
  @IsOptional()
  @IsIn(['interested','desired','purchased','recommended'])
  relation?: 'interested' | 'desired' | 'purchased' | 'recommended' = 'desired';

  @ApiProperty({ required: false, description: 'Source label (ex.: bot_whatsapp)' })
  @IsOptional()
  @IsString()
  source?: string;
}
