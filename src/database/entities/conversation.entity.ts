import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lead } from './lead.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Index(['public_id'], { unique: true })
@Index(['organization_id'])
@Index(['lead_id'])
@Index(['organization_id', 'app', 'conversation_id'], { 
  unique: true, 
  where: 'app IS NOT NULL AND conversation_id IS NOT NULL' 
})
export class Conversation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id: string;

  @Column({ type: 'bigint' })
  organization_id: number;

  @Column({ type: 'bigint' })
  lead_id: number;

  @Column({ type: 'text' })
  channel: string; // 'whatsapp' | 'instagram' | etc

  @Column({ type: 'text', nullable: true })
  app: string; // 'evolution' | etc

  @Column({ type: 'text', nullable: true })
  conversation_id: string; // External conversation ID

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date;

  @ManyToOne(() => Lead, (lead) => lead.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}