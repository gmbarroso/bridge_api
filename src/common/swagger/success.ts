import { ApiProperty } from '@nestjs/swagger';

export class MessageResponse {
  @ApiProperty({ example: 'OK' })
  message!: string;
}

export class TokenPairResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}

export class LoginUser {
  @ApiProperty({ example: 123 })
  id!: number;

  @ApiProperty({ example: 'b1b0f6fe-8f7f-4a5c-b8f1-6f3c0d8b8f7a' })
  public_id!: string;

  @ApiProperty({ example: 'user@org.com' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  role!: string;

  @ApiProperty({ example: 1 })
  organization_id!: number;

  @ApiProperty({ example: null, nullable: true })
  suborganization_id!: number | null;
}

export class LoginResponse extends TokenPairResponse {
  @ApiProperty({ type: LoginUser })
  user!: LoginUser;
}

export class ApiKeyInfoResponse {
  @ApiProperty({ example: 'f1b0f6fe-8f7f-4a5c-b8f1-6f3c0d8b8f7a' })
  public_id!: string;

  @ApiProperty({ example: 'Prod Bot' })
  name!: string;

  @ApiProperty({ example: '2025-10-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: null, nullable: true })
  revoked_at!: string | null;
}

export class ApiKeyGenerationResponse {
  @ApiProperty({ example: 'f1b0f6fe-8f7f-4a5c-b8f1-6f3c0d8b8f7a' })
  public_id!: string;

  @ApiProperty({ example: 'bridge_1_1729543200000_dev' })
  apiKey!: string;

  @ApiProperty({ example: 'bridge_hmac_1_1729543200000_dev' })
  hmac_secret!: string;

  @ApiProperty({ example: '2025-10-10T12:00:00.000Z' })
  created_at!: string;
}

export class ApiKeyUsageByKey {
  @ApiProperty({ example: 'Prod Bot' })
  name!: string;

  @ApiProperty({ example: 200 })
  count!: number;
}

export class ApiKeyUsageResponse {
  @ApiProperty({ example: 10234 })
  totalRequests!: number;

  @ApiProperty({ example: 345 })
  last24h!: number;

  @ApiProperty({ type: [ApiKeyUsageByKey] })
  byKey!: ApiKeyUsageByKey[];
}

// -------- BFF Models --------

export class BffServiceLink {
  @ApiProperty({ example: 'corte-feminino' })
  slug!: string;

  @ApiProperty({ example: 'Corte Feminino' })
  title!: string;

  @ApiProperty({ example: 'desired', enum: ['desired', 'interested', 'purchased'] })
  relation!: 'desired' | 'interested' | 'purchased';

  @ApiProperty({ example: '2025-10-10T12:34:56.000Z' })
  ts!: string;
}

export class BffLeadListItem {
  @ApiProperty({ example: 'f1b0...' })
  id!: string;

  @ApiProperty({ example: 'Ana' })
  name!: string;

  @ApiProperty({ example: '+55 21 99999-9999' })
  phone!: string;

  @ApiProperty({ example: 'whatsapp' })
  source!: string;

  @ApiProperty({ example: 'new' })
  stage!: string;

  @ApiProperty({ example: '2025-10-10T12:34:56.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-10-11T10:00:00.000Z', nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ example: 'corte-feminino', nullable: true })
  servico_desejado?: string | null;
}

export class BffLeadListResponse {
  @ApiProperty({ type: [BffLeadListItem] })
  items!: BffLeadListItem[];

  @ApiProperty({ example: null, nullable: true })
  nextCursor!: string | null;
}

export class BffLeadDetailTotals {
  @ApiProperty({ example: 2 })
  conversations!: number;

  @ApiProperty({ example: 5 })
  messages!: number;
}

export class BffLeadDetailResponse {
  @ApiProperty({ example: 'f1b0...' })
  id!: string;

  @ApiProperty({ example: 'Ana' })
  name!: string;

  @ApiProperty({ example: '+55 21 99999-9999' })
  phone!: string;

  @ApiProperty({ example: 'ana@ex.com', nullable: true })
  email?: string | null;

  @ApiProperty({ example: 'whatsapp' })
  source!: string;

  @ApiProperty({ example: 'new' })
  stage!: string;

  @ApiProperty({ example: '2025-10-10T12:34:56.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-10-11T10:00:00.000Z', nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ example: 'corte-feminino', nullable: true })
  desiredService?: string | null;

  @ApiProperty({ type: [BffServiceLink] })
  serviceLinks!: BffServiceLink[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  attributes!: Record<string, any>;

  @ApiProperty({ type: BffLeadDetailTotals })
  totals!: BffLeadDetailTotals;
}

export class BffTimelineMessageItem {
  @ApiProperty({ example: 'message' })
  kind!: 'message';

  @ApiProperty({ example: 'm1...' })
  id!: string;

  @ApiProperty({ example: '2025-10-11T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: 'in', enum: ['in', 'out'] })
  direction!: 'in' | 'out';

  @ApiProperty({ example: 'text' })
  type!: string;

  @ApiProperty({ example: 'Oi!' })
  snippet!: string;

  @ApiProperty({ example: 'c1...' })
  conversationId!: string;
}

export class BffTimelineResponse {
  @ApiProperty({ type: [BffTimelineMessageItem] })
  items!: BffTimelineMessageItem[];

  @ApiProperty({ example: null, nullable: true })
  nextCursor!: string | null;
}

// -------- Onboarding Models --------

export class OnboardingWebhookUrls {
  @ApiProperty({ example: 'https://api.seudominio.com/ingest/lead-upsert' })
  leadUpsert!: string;

  @ApiProperty({ example: 'https://api.seudominio.com/ingest/lead-attribute' })
  leadAttribute!: string;

  @ApiProperty({ example: 'https://api.seudominio.com/ingest/lead-service' })
  leadService!: string;

  @ApiProperty({ example: 'https://api.seudominio.com/ingest/message' })
  message!: string;
}

export class OnboardingAdminInvite {
  @ApiProperty({ example: 'owner@cliente.com' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  role!: 'admin';

  @ApiProperty({ example: 'https://app.seudominio.com/accept-invite?token=...' })
  inviteUrl!: string;

  @ApiProperty({ example: '2025-11-01T12:00:00.000Z' })
  expiresAt!: string;
}

export class OnboardingResponse {
  @ApiProperty({ example: 123456 })
  organizationId!: number;

  @ApiProperty({ example: 'bridge_123456_1729600000000_prod' })
  apiKey!: string;

  @ApiProperty({ example: 'bridge_hmac_123456_1729600000000_abc' })
  hmacSecret!: string;

  @ApiProperty({ example: '# Instruções detalhadas...' })
  setupInstructions!: string;

  @ApiProperty({ type: OnboardingWebhookUrls })
  webhookUrls!: OnboardingWebhookUrls;

  @ApiProperty({ type: [String], example: ['curl -X POST ...'] })
  testCommands!: string[];

  @ApiProperty({ type: [String], example: [
    'Configurar API Key no bot (x-api-key)',
    'Definir webhook para /ingest/lead-upsert',
    'Testar criação de lead',
    'Vincular serviço desejado (lead-service)',
    'Enviar mensagem de teste',
    'Verificar no dashboard/BFF'
  ] })
  checklist!: string[];

  @ApiProperty({ type: OnboardingAdminInvite, required: false })
  adminInvite?: OnboardingAdminInvite;
}
