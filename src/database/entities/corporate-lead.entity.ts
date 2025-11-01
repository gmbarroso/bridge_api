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
import { Organization } from './organization.entity';
import { Suborganization } from './suborganization.entity';
import { User } from './user.entity';

@Entity('corporate_leads')
@Index(['organization_id'])
@Index(['session_id'], { unique: true })
export class CorporateLead {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id!: string;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id!: number | null;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization!: Suborganization | null;

  @Column({ type: 'bigint', nullable: true })
  owner_user_id!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'owner_user_id' })
  owner_user!: User | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  company_name!: string | null;

  @Column({ type: 'text', nullable: true })
  document!: string | null;

  @Column({ type: 'text', default: 'whatsapp' })
  source!: string;

  @Column({ type: 'text', default: 'new' })
  stage!: string;

  @Column({ type: 'text', unique: true })
  session_id!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  consents!: Record<string, any>;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  tags!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  extra_attributes!: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  first_contact_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_contact_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  first_response_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
