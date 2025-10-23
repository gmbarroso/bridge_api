import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column({ type: 'text' })
  token_hash!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;

  @Column({ type: 'bigint', nullable: true })
  replaced_by_token_id!: number | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'text', nullable: true })
  ip!: string | null;
}
