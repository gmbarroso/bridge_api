import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreSchema1730937600000 implements MigrationInterface {
  name = 'CreateCoreSchema1730937600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE organizations (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sub_organizations (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_sub_organizations_org ON sub_organizations(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE api_keys (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        hmac_secret TEXT NULL,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revoked_at TIMESTAMPTZ NULL,
        last_used_at TIMESTAMPTZ NULL,
        UNIQUE (public_id),
        UNIQUE (key_hash),
        UNIQUE (organization_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_api_keys_org ON api_keys(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE users (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_algo TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        name TEXT NULL,
        phone TEXT NULL,
        avatar_url TEXT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        timezone TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id),
        UNIQUE (organization_id, email)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_org ON users(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_users_sub_org ON users(sub_organization_id)`);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revoked_at TIMESTAMPTZ NULL,
        replaced_by_token_id BIGINT NULL REFERENCES refresh_tokens(id) ON DELETE SET NULL,
        user_agent TEXT NULL,
        ip TEXT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)`);

    await queryRunner.query(`
      CREATE TABLE user_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        refresh_token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        remember_me BOOLEAN NOT NULL DEFAULT FALSE,
        device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_user_sessions_user ON user_sessions(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_user_sessions_org ON user_sessions(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE user_preferences (
        user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT NOT NULL DEFAULT 'system',
        show_tips BOOLEAN NOT NULL DEFAULT TRUE,
        default_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE leads (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        owner_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        phone TEXT NULL,
        email TEXT NULL,
        name TEXT NULL,
        document TEXT NULL,
        source TEXT NOT NULL DEFAULT 'whatsapp',
        stage TEXT NOT NULL DEFAULT 'new',
        session_id TEXT NOT NULL,
        consents JSONB NOT NULL DEFAULT '{}'::jsonb,
        tags TEXT[] NOT NULL DEFAULT '{}'::text[],
        extra_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        first_contact_at TIMESTAMPTZ NULL,
        last_contact_at TIMESTAMPTZ NULL,
        last_message_at TIMESTAMPTZ NULL,
        first_response_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        "pushName" TEXT NULL,
        servico TEXT NULL,
        UNIQUE (public_id),
        UNIQUE (session_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_leads_org ON leads(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_leads_sub_org ON leads(sub_organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_leads_stage ON leads(stage)`);
    await queryRunner.query(`CREATE INDEX idx_leads_session ON leads(session_id)`);

    await queryRunner.query(`
      CREATE TABLE corporate_leads (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        owner_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        phone TEXT NULL,
        email TEXT NULL,
        company_name TEXT NULL,
        document TEXT NULL,
        source TEXT NOT NULL DEFAULT 'whatsapp',
        stage TEXT NOT NULL DEFAULT 'new',
        session_id TEXT NOT NULL,
        consents JSONB NOT NULL DEFAULT '{}'::jsonb,
        tags TEXT[] NOT NULL DEFAULT '{}'::text[],
        extra_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        first_contact_at TIMESTAMPTZ NULL,
        last_contact_at TIMESTAMPTZ NULL,
        last_message_at TIMESTAMPTZ NULL,
        first_response_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id),
        UNIQUE (session_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_corporate_leads_org ON corporate_leads(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_corporate_leads_session ON corporate_leads(session_id)`);

    await queryRunner.query(`
      CREATE TABLE documents (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        embedding VECTOR(1536) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_documents_org ON documents(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE professionals (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT NULL,
        phone TEXT NULL,
        specialty TEXT NULL,
        calendar_uuid TEXT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_professionals_org ON professionals(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE agenda (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        professional_id BIGINT NULL REFERENCES professionals(id) ON DELETE SET NULL,
        title TEXT NULL,
        service TEXT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_agenda_org ON agenda(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_agenda_lead ON agenda(lead_id)`);
    await queryRunner.query(`CREATE INDEX idx_agenda_professional ON agenda(professional_id)`);

    await queryRunner.query(`
      CREATE TABLE chats (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        corporate_lead_id BIGINT NULL REFERENCES corporate_leads(id) ON DELETE SET NULL,
        conversation_id TEXT NOT NULL UNIQUE,
        channel TEXT NULL,
        app TEXT NULL,
        phone TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_message_at TIMESTAMPTZ NULL,
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_chats_org ON chats(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE chat_messages (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        conversation_id TEXT NOT NULL REFERENCES chats(conversation_id) ON DELETE CASCADE,
        message_type TEXT NOT NULL,
        bot_message TEXT NULL,
        user_message TEXT NULL,
        phone TEXT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        data TEXT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id)`);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_sent_at ON chat_messages(sent_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE n8n_chat_histories (
        id BIGSERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        message JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_n8n_chat_histories_session ON n8n_chat_histories(session_id)`);

    await queryRunner.query(`
      CREATE TABLE tokens (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        corporate_lead_id BIGINT NULL REFERENCES corporate_leads(id) ON DELETE SET NULL,
        workflow TEXT NOT NULL,
        input JSONB NULL,
        output JSONB NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        cached_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_tokens_org ON tokens(organization_id)`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        corporate_lead_id BIGINT NULL REFERENCES corporate_leads(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        read_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_org ON notifications(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_lead ON notifications(lead_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_created ON notifications(created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS n8n_chat_histories`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS chats`);
    await queryRunner.query(`DROP TABLE IF EXISTS agenda`);
    await queryRunner.query(`DROP TABLE IF EXISTS professionals`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS corporate_leads`);
    await queryRunner.query(`DROP TABLE IF EXISTS leads`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_preferences`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS sub_organizations`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);

    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
