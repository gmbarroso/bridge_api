import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { Lead } from './lead.entity';

@Entity('chat_messages')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['chat_id', 'sent_at'])
@Index(['lead_id', 'sent_at'])
export class ChatMessage {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'bigint' })
  chat_id!: number;

  @Column({ type: 'bigint', nullable: true })
  lead_id!: number | null;

  @Column({ type: 'text', nullable: true })
  conversation_id!: string | null;

  @Column({ type: 'text' })
  direction!: 'in' | 'out' | 'system';

  @Column({ type: 'text', default: 'text' })
  message_type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  bot_message!: string | null;

  @Column({ type: 'text', nullable: true })
  user_message!: string | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'boolean', default: () => 'true' })
  active!: boolean;

  @Column({ type: 'text', nullable: true })
  data!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  sent_at!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: Chat;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead!: Lead | null;
}
