import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn({ type: 'bigint' })
  user_id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', default: 'system' })
  theme!: string;

  @Column({ type: 'boolean', default: () => 'true' })
  show_tips!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  default_filters!: Record<string, any>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
