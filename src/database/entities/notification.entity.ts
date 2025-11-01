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
import { Suborganization } from './suborganization.entity';
import { Lead } from './lead.entity';
import { CorporateLead } from './corporate-lead.entity';

@Entity('notifications')
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['corporate_lead_id'])
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id!: number | null;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization!: Suborganization | null;

  @Column({ type: 'text' })
  type!: string;

  @Column({ type: 'bigint', nullable: true })
  lead_id!: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead | null;

  @Column({ type: 'bigint', nullable: true })
  corporate_lead_id!: number | null;

  @ManyToOne(() => CorporateLead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'corporate_lead_id' })
  corporate_lead!: CorporateLead | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  read_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
