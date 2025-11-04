import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Tema da interface', enum: ['light', 'dark'] })
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';
}
