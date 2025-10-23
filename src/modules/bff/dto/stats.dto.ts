import { IsDateString, IsOptional } from 'class-validator';

export class TrendQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string; // inclusive

  @IsOptional()
  @IsDateString()
  dateTo?: string; // inclusive
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
