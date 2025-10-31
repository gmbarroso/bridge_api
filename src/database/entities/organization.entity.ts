import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['public_id'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  type!: string | null;

  @Column({ type: 'boolean', default: () => 'true' })
  is_active!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
