import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './chat.entity';

@Entity('chat_messages')
@Index(['public_id'], { unique: true })
@Index(['conversation_id'])
@Index(['sent_at'])
export class ChatMessage {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'text' })
  conversation_id!: string;

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
  @JoinColumn({ name: 'conversation_id', referencedColumnName: 'conversation_id' })
  chat!: Chat;
}
