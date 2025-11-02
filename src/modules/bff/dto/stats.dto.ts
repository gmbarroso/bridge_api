import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class TrendQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string; // inclusive

  @IsOptional()
  @IsDateString()
  dateTo?: string; // inclusive

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export type SummaryStats = {
  totalLeads: number;
  leadsByStage: Record<string, number>;
  leadsToday: number;
  activeLeadsLast24h: number;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type TrendResponse = {
  points: TrendPoint[];
};
