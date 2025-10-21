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
export class ApiKey {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  key_hash: string;

  @Column({ type: 'varchar', length: 255 })
  hmac_secret: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active' | 'inactive' | 'revoked'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rotated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date;
}