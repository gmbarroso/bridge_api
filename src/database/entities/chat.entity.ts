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
import { Lead } from './lead.entity';
import { Suborganization } from './suborganization.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chats')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['organization_id', 'app', 'conversation_id'], {
  unique: true,
  where: 'app IS NOT NULL AND conversation_id IS NOT NULL',
})
export class Chat {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'bigint', nullable: true })
  sub_organization_id!: number | null;

  @Column({ type: 'bigint' })
  lead_id!: number;

  @Column({ type: 'text' })
  channel!: string;

  @Column({ type: 'text', nullable: true })
  app!: string | null;

  @Column({ type: 'text', nullable: true })
  conversation_id!: string | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', default: 'open' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at!: Date | null;

  @ManyToOne(() => Lead, (lead) => lead.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead;

  @ManyToOne(() => Suborganization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sub_organization_id' })
  suborganization!: Suborganization | null;

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages!: ChatMessage[];
}
