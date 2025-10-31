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
import { Chat } from './chat.entity';
import { LeadAttribute } from './lead-attribute.entity';
import { FormSubmission } from './form-submission.entity';
import { User } from './user.entity';
import { Suborganization } from './suborganization.entity';

@Entity('leads')
@Index(['organization_id'])
@Index(['organization_id', 'public_id'], { unique: true })
@Index(['organization_id', 'phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['organization_id', 'stage'])
@Index(['organization_id', 'session_id'])
export class Lead {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id: number;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization: Suborganization | null;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  document: string;

  @Column({ type: 'text', nullable: true })
  source: string; // 'whatsapp' | 'instagram' | 'site' | etc

  @Column({ type: 'text', default: 'new' })
  stage: string; // 'new' | 'qualified' | 'scheduled' | 'converted' | 'lost'

  @Column({ type: 'text', nullable: true })
  session_id: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  consents: Record<string, any>;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  extra_attributes: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  first_contact_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_contact_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  first_response_at: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_user_id' })
  owner_user: User | null;

  @Column({ type: 'bigint', nullable: true })
  owner_user_id: number | null;

  @OneToMany(() => Chat, (chat) => chat.lead)
  chats: Chat[];

  @OneToMany(() => LeadAttribute, (attribute) => attribute.lead)
  attributes: LeadAttribute[];

  @OneToMany(() => FormSubmission, (submission) => submission.lead)
  form_submissions: FormSubmission[];
}
