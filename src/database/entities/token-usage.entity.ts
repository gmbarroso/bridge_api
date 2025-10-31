import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Lead } from './lead.entity';

@Entity('tokens')
@Index(['organization_id', 'created_at'])
@Index(['lead_id', 'created_at'])
export class TokenUsage {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'bigint', nullable: true })
  lead_id!: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead | null;

  @Column({ type: 'text' })
  workflow!: string;

  @Column({ type: 'jsonb', nullable: true })
  input!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  output!: Record<string, any> | null;

  @Column({ type: 'integer', default: 0 })
  prompt_tokens!: number;

  @Column({ type: 'integer', default: 0 })
  completion_tokens!: number;

  @Column({ type: 'integer', default: 0 })
  cached_tokens!: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, default: 0 })
  cost_usd!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
