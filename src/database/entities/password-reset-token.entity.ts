import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column({ type: 'text', unique: true })
  token_hash!: string;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
