import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { LeadAttribute } from './lead-attribute.entity';
import { FormSubmission } from './form-submission.entity';

@Entity('leads')
@Index(['organization_id'])
@Index(['public_id'], { unique: true })
@Index(['organization_id', 'phone'], { unique: true, where: 'phone IS NOT NULL' })
export class Lead {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint', nullable: true })
  suborganization_id: number;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  source: string; // 'whatsapp' | 'instagram' | 'site' | etc

  @Column({ type: 'text', default: 'new' })
  stage: string; // 'new' | 'qualified' | 'scheduled' | 'converted' | 'lost'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  first_response_at: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.lead)
  conversations: Conversation[];

  @OneToMany(() => LeadAttribute, (attribute) => attribute.lead)
  attributes: LeadAttribute[];

  @OneToMany(() => FormSubmission, (submission) => submission.lead)
  form_submissions: FormSubmission[];
}