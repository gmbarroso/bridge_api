import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Suborganization } from './suborganization.entity';
import { ChatMessage } from './chat-message.entity';
import { Lead } from './lead.entity';
import { Organization } from './organization.entity';

@Entity('chats')
@Index(['organization_id'])
@Index(['conversation_id'], { unique: true })
export class Chat {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
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
  lead_id!: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead | null;

  @Column({ type: 'text', nullable: true })
  channel!: string | null;

  @Column({ type: 'text', nullable: true })
  app!: string | null;

  @Column({ type: 'text' })
  conversation_id!: string;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at!: Date | null;

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages!: ChatMessage[];
}
