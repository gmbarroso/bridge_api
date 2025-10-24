import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lead_service_links')
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['service_id'])
@Index(['lead_id', 'service_id', 'relation'], { unique: true })
export class LeadServiceLink {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'bigint' })
  lead_id!: number;

  @Column({ type: 'bigint' })
  service_id!: number;

  @Column({ type: 'text' })
  relation!: 'interested' | 'desired' | 'purchased' | 'recommended';

  @Column({ type: 'text', nullable: true })
  source!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  ts!: Date;
}
