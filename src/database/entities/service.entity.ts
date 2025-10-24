import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('services')
@Index(['organization_id'])
@Index(['suborganization_id'])
@Index(['organization_id', 'slug'], { unique: true })
export class Service {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  public_id!: string;

  @Column({ type: 'bigint' })
  organization_id!: number;

  @Column({ type: 'bigint', nullable: true })
  suborganization_id!: number | null;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'text' })
  audience!: string;

  @Column({ type: 'text' })
  service_type!: 'produto' | 'servico' | 'conceito';

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags!: string[];

  @Column({ type: 'text', nullable: true })
  source_url!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null; // markdown

  @Column({ type: 'text', default: 'active' })
  status!: 'active' | 'inactive';

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
