import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Lead } from './lead.entity';
import { Professional } from './professional.entity';
import { Suborganization } from './suborganization.entity';

@Entity('agenda')
@Index(['organization_id', 'start_at'])
@Index(['lead_id', 'start_at'])
export class AgendaItem {
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

  @Column({ type: 'bigint', nullable: true })
  lead_id!: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead | null;

  @Column({ type: 'bigint', nullable: true })
  professional_id!: number | null;

  @ManyToOne(() => Professional, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'professional_id' })
  professional!: Professional | null;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  service!: string | null;

  @Column({ type: 'timestamptz' })
  start_at!: Date;

  @Column({ type: 'timestamptz' })
  end_at!: Date;

  @Column({ type: 'text', nullable: true })
  status!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
