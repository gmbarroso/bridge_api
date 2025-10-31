import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { Service } from './service.entity';

@Entity('lead_service_events')
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['service_id'])
@Index(['organization_id', 'lead_id', 'ts'])
@Index(['sub_organization_id'])
export class LeadServiceEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id!: string;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'bigint' })
  lead_id!: number;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id!: number | null;

  @Column({ type: 'bigint' })
  service_id!: number;

  @Column({ type: 'text' })
  relation!: 'interested' | 'desired' | 'purchased' | 'recommended';

  @Column({ type: 'text', nullable: true })
  source!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  ts!: Date;

  @ManyToOne(() => Lead, (lead) => lead.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @ManyToOne(() => Service, (service) => service.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: Service;
}
