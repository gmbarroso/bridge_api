import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'bigint', nullable: true })
  user_id!: number | null;

  @Column({ type: 'text', unique: true })
  token_hash!: string;

  @Column({ type: 'text' })
  type!: 'email_verify' | 'invite';

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  organization?: Organization | null;

  @Column({ type: 'bigint', nullable: true })
  organization_id!: number | null;

  @Column({ type: 'text', nullable: true })
  invite_email!: string | null;

  @Column({ type: 'text', nullable: true })
  invite_role!: 'viewer' | 'agent' | 'admin' | null;

  @Column({ type: 'bigint', nullable: true })
  invited_by_user_id!: number | null;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
