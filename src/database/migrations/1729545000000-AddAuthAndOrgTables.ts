import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthAndOrgTables1729545000000 implements MigrationInterface {
  name = 'AddAuthAndOrgTables1729545000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        sub_organizations JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suborganizations (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        password_algo TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        email_verified_at TIMESTAMPTZ,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        suborganization_id BIGINT REFERENCES suborganizations(id) ON DELETE SET NULL,
        role TEXT NOT NULL CHECK (role IN ('viewer','agent','admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revoked_at TIMESTAMPTZ,
        replaced_by_token_id BIGINT,
        user_agent TEXT,
        ip TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('email_verify')),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Seed default development organization to satisfy existing foreign keys in dev
    await queryRunner.query(`
      INSERT INTO organizations (id, name)
      VALUES (1, 'Development Org')
      ON CONFLICT (id) DO NOTHING
    `);

    // Add FKs from existing tables to organizations and suborganizations
    await queryRunner.query(`
      ALTER TABLE api_keys ADD CONSTRAINT IF NOT EXISTS fk_api_keys_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS fk_leads_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS fk_leads_suborg FOREIGN KEY (suborganization_id) REFERENCES suborganizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE conversations ADD CONSTRAINT IF NOT EXISTS fk_conversations_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE messages ADD CONSTRAINT IF NOT EXISTS fk_messages_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE lead_attributes ADD CONSTRAINT IF NOT EXISTS fk_lead_attributes_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);
    await queryRunner.query(`
      ALTER TABLE form_submissions ADD CONSTRAINT IF NOT EXISTS fk_form_submissions_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    `);

    // Optional trigram indexes for quick search
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON leads USING GIN (name gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_email_trgm ON leads USING GIN (email gin_trgm_ops)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_email_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_name_trgm`);

    await queryRunner.query(`ALTER TABLE form_submissions DROP CONSTRAINT IF EXISTS fk_form_submissions_org`);
    await queryRunner.query(`ALTER TABLE lead_attributes DROP CONSTRAINT IF EXISTS fk_lead_attributes_org`);
    await queryRunner.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_org`);
    await queryRunner.query(`ALTER TABLE conversations DROP CONSTRAINT IF EXISTS fk_conversations_org`);
    await queryRunner.query(`ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_suborg`);
    await queryRunner.query(`ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_org`);
    await queryRunner.query(`ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS fk_api_keys_org`);

    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS verification_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS suborganizations`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    // keep extension pg_trgm installed
  }
}
