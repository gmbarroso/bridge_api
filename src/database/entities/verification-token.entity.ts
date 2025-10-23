import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  // Nullable para tokens do tipo 'invite' (usuário ainda não existe)
  @Column({ type: 'bigint', nullable: true })
  user_id!: number | null;

  @Column({ type: 'text', unique: true })
  token_hash!: string;

  // Tipos suportados: verificação de email e convite
  @Column({ type: 'text' })
  type!: 'email_verify' | 'invite';

  // Metadados específicos para convites
  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  organization?: Organization | null;

  @Column({ type: 'bigint', nullable: true })
  organization_id!: number | null;

  // E-mail alvo do convite (pode não existir como usuário ainda)
  @Column({ type: 'text', nullable: true })
  invite_email!: string | null;

  // Papel sugerido para o usuário convidado
  @Column({ type: 'text', nullable: true })
  invite_role!: 'viewer' | 'agent' | 'admin' | null;

  // Quem gerou o convite (opcional)
  @Column({ type: 'bigint', nullable: true })
  invited_by_user_id!: number | null;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
