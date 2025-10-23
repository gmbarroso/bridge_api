import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  public_id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  sub_organizations!: any[];

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
