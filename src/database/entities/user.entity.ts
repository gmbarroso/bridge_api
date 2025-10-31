import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, Index } from 'typeorm';
import { Organization } from './organization.entity';
import { Suborganization } from './suborganization.entity';

@Entity('users')
@Index(['public_id'], { unique: true })
@Index(['organization_id', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'text' })
  password_hash!: string;

  @Column({ type: 'text' })
  password_algo!: string;

  @Column({ type: 'text' })
  password_salt!: string;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at!: Date | null;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization!: Suborganization | null;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id!: number | null;

  @Column({ type: 'text' })
  role!: 'viewer' | 'agent' | 'manager' | 'admin';

  @Column({ type: 'text', nullable: true })
  timezone!: string | null;

  @Column({ type: 'boolean', default: () => 'true' })
  is_active!: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
