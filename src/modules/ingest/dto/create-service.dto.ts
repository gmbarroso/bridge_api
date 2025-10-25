import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'corte-feminino', description: 'Slug único por organização' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ example: 'Corte Feminino' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'beleza' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'adulto' })
  @IsString()
  audience!: string;

  @ApiProperty({ example: 'servico', enum: ['produto', 'servico', 'conceito'] })
  @IsIn(['produto', 'servico', 'conceito'])
  service_type!: 'produto' | 'servico' | 'conceito';

  @ApiProperty({ example: ['cabelo', 'feminino'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: 'https://site.com/servicos/corte-feminino', required: false })
  @IsOptional()
  @IsString()
  source_url?: string | null;

  @ApiProperty({ example: 'Descrição em markdown', required: false })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ example: 'active', required: false, enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
