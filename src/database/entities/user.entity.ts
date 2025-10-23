import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Suborganization } from './suborganization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Column({ type: 'text' })
  password_hash!: string;

  @Column({ type: 'text' })
  password_algo!: string;

  @Column({ type: 'text' })
  password_salt!: string;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at!: Date | null;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT' })
  organization!: Organization;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  suborganization!: Suborganization | null;

  @Column({ type: 'bigint', nullable: true })
  suborganization_id!: number | null;

  @Column({ type: 'text' })
  role!: 'viewer' | 'agent' | 'admin';

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
