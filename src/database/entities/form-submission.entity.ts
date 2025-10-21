import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lead } from './lead.entity';

@Entity('form_submissions')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['lead_id'])
export class FormSubmission {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint' })
  lead_id: number;

  @Column({ type: 'bigint', nullable: true })
  form_schema_id: number;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  ts: Date;

  // Relationships
  @ManyToOne(() => Lead, (lead) => lead.form_submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
}