import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListLeadsDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  cursor?: string; // base64(created_at|id)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export type LeadListItem = {
  id: string; // public_id
  name: string | null;
  phone: string | null;
  source: string | null;
  stage: string;
  createdAt: string;
  lastMessageAt: string | null;
  // Enriched from lead_unified_view when available
  servico_desejado?: string | null;
  firstResponseSlaMin?: number | null;
  totalMessages?: number | null;
  lastMessageSnippet?: string | null;
};

export type ListLeadsResponse = {
  items: LeadListItem[];
  nextCursor?: string | null;
};

export class CursorDto {
  @IsOptional()
  @IsString()
  cursor?: string; // base64(created_at|id)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export type LeadDetail = {
  id: string; // public_id
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  createdAt: string;
  lastMessageAt: string | null;
  // Convenience top-level field for UI usage (also present in attributes)
  desiredService?: string | null;
  // All linked services for this lead (most recent first)
  serviceLinks?: Array<{
    slug: string;
    title: string | null;
    relation: string;
    ts: string;
  }>;
  attributes?: Record<string, string | null>;
  totals?: {
    conversations: number;
    messages: number;
  };
};

export type LeadTimelineItem = {
  kind: 'message';
  id: string; // public_id
  createdAt: string;
  direction: 'in' | 'out';
  type: string;
  snippet?: string | null;
  conversationId: string; // conversation public_id
};

export type LeadTimelineResponse = {
  items: LeadTimelineItem[];
  nextCursor?: string | null;
};
