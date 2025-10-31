import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
@Index(['organization_id'])
@Index(['public_id'], { unique: true })
@Index(['key_hash'], { unique: true })
export class ApiKey {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  key_hash: string;

  @Column({ type: 'text', nullable: true })
  hmac_secret: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  permissions: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date | null;
}
