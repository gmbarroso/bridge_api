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

export class BffLeadListItem {
  @ApiProperty({ example: 'person', enum: ['person', 'corporate'] })
  kind!: 'person' | 'corporate';

  @ApiProperty({ example: 'session-01HZY9Q3CH9R9' })
  sessionId!: string;

  @ApiProperty({ example: 'f1b0...' })
  leadPublicId!: string;

  @ApiProperty({ example: 'Bridge Tecnologia', nullable: true })
  companyName!: string | null;

  @ApiProperty({ example: 'Ana', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'ana@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '+55 21 99999-9999', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'whatsapp' })
  source!: string;

  @ApiProperty({ example: 'new' })
  stage!: string;

  @ApiProperty({ example: '2025-10-10T12:34:56.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-10-11T10:00:00.000Z', nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ example: 'corte-feminino', nullable: true })
  servico!: string | null;

  @ApiProperty({ example: 'c1b0b0d1-0000-4000-8000-000000000000', nullable: true })
  conversationPublicId!: string | null;

  @ApiProperty({ example: 25, nullable: true })
  colaboradores!: number | null;

  @ApiProperty({ example: 'PME', nullable: true })
  tipoCliente!: string | null;

  @ApiProperty({ example: 'Diretor Comercial', nullable: true })
  cargo!: string | null;

  @ApiProperty({ example: 'Bridge Tecnologia', nullable: true })
  empresa!: string | null;

  @ApiProperty({ example: 'Reunião com João', nullable: true })
  nomeAgendado!: string | null;

  @ApiProperty({ example: '12.345.678/0001-99', nullable: true })
  cpfCnpj!: string | null;
}

export class BffLeadListResponse {
  @ApiProperty({ type: [BffLeadListItem] })
  items!: BffLeadListItem[];

  @ApiProperty({ example: null, nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: 25, description: 'Total de itens que correspondem à busca, sem paginação.' })
  total!: number;
}

export class BffCorporateLeadListItem {
  @ApiProperty({ example: 'corp-session-123' })
  sessionId!: string;

  @ApiProperty({ example: 'corp-public-id' })
  leadPublicId!: string;

  @ApiProperty({ example: 'Bridge Tecnologia', nullable: true })
  companyName!: string | null;

  @ApiProperty({ example: 50, nullable: true })
  colaboradores!: number | null;

  @ApiProperty({ example: 'Enterprise', nullable: true })
  tipoCliente!: string | null;

  @ApiProperty({ example: 'CEO', nullable: true })
  cargo!: string | null;

  @ApiProperty({ example: 'Bridge Tecnologia LTDA', nullable: true })
  empresa!: string | null;

  @ApiProperty({ example: 'Reunião de onboarding', nullable: true })
  nomeAgendado!: string | null;

  @ApiProperty({ example: '12.345.678/0001-99', nullable: true })
  cpfCnpj!: string | null;

  @ApiProperty({ example: 'contato@bridge.inc', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '+55 11 90000-0000', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'whatsapp' })
  source!: string;

  @ApiProperty({ example: 'new' })
  stage!: string;

  @ApiProperty({ example: '2025-10-10T12:34:56.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-10-11T10:00:00.000Z', nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ example: 'c1b0b0d1-0000-4000-8000-000000000000', nullable: true })
  conversationPublicId!: string | null;
}

export class BffCorporateLeadListResponse {
  @ApiProperty({ type: [BffCorporateLeadListItem] })
  items!: BffCorporateLeadListItem[];

  @ApiProperty({ example: null, nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: 25, description: 'Total de itens que correspondem à busca, sem paginação.' })
  total!: number;
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
