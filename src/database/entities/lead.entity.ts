import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Suborganization } from './suborganization.entity';
import { Chat } from './chat.entity';

@Entity('leads')
@Index(['organization_id'])
@Index(['sub_organization_id'])
@Index(['stage'])
@Index(['kind'])
@Index(['session_id'], { unique: true })
export class Lead {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id: number | null;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization: Suborganization | null;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  company_name: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  document: string | null;

  @Column({ type: 'integer', nullable: true })
  colaboradores: number | null;

  @Column({ type: 'text', nullable: true })
  tipo_cliente: string | null;

  @Column({ type: 'text', nullable: true })
  cargo: string | null;

  @Column({ type: 'text', nullable: true })
  empresa: string | null;

  @Column({ type: 'text', nullable: true })
  nome_agendado: string | null;

  @Column({ type: 'text', nullable: true })
  cpf_cnpj: string | null;

  @Column({ type: 'text', default: 'whatsapp' })
  source: string;

  @Column({ type: 'text', default: 'person' })
  kind: 'person' | 'corporate';

  @Column({ type: 'text', default: 'new' })
  stage: string;

  @Column({ type: 'text', unique: true })
  session_id: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  consents: Record<string, any>;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  extra_attributes: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  first_contact_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_contact_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  first_response_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'text', nullable: true, name: 'pushname' })
  pushName: string | null;

  @Column({ type: 'text', nullable: true, name: 'service' })
  servico: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_user_id' })
  owner_user: User | null;

  @Column({ type: 'bigint', nullable: true })
  owner_user_id: number | null;

  @OneToMany(() => Chat, (chat) => chat.lead)
  chats: Chat[];
}
