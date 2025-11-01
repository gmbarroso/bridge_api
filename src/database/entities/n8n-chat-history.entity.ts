import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('n8n_chat_histories')
@Index(['session_id'])
export class N8nChatHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'text' })
  session_id!: string;

  @Column({ type: 'jsonb' })
  message!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
