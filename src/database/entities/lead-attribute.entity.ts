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

@Entity('lead_attributes')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['sub_organization_id'])
export class LeadAttribute {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint' })
  lead_id: number;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id: number | null;

  @Column({ type: 'text' })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'text', nullable: true })
  source: string;

  @CreateDateColumn({ type: 'timestamptz' })
  ts: Date;

  // Relationships
  @ManyToOne(() => Lead, (lead) => lead.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
}
