import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['conversation_id'])
@Index(['created_at'])
export class Message {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint' })
  conversation_id: number;

  @Column({ type: 'text' })
  direction: string; // 'in' | 'out'

  @Column({ type: 'text' })
  type: string; // 'text' | 'image' | 'doc' | 'audio'

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}