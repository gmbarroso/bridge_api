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
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity('user_sessions')
@Index(['organization_id'])
@Index(['user_id'])
export class UserSession {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'bigint' })
  user_id!: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'text' })
  refresh_token_hash!: string;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'boolean', default: () => 'false' })
  remember_me!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  device_metadata!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
