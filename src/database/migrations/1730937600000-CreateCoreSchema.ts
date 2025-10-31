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
      CREATE TABLE users (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL,
        name TEXT NULL,
        phone TEXT NULL,
        avatar_url TEXT NULL,
        password_hash TEXT NOT NULL,
        password_algo TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        email_verified_at TIMESTAMPTZ NULL,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        role TEXT NOT NULL,
        timezone TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id),
        UNIQUE (organization_id, email),
        CHECK (role IN ('viewer','agent','manager','admin'))
      )
    `);
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
      CREATE TABLE services (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        audience TEXT NOT NULL,
        service_type TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        source_url TEXT NULL,
        content TEXT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        embedding VECTOR(1536) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, slug),
        UNIQUE (public_id),
        CHECK (service_type IN ('produto','servico','conceito')),
        CHECK (status IN ('active','inactive'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_services_org ON services(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_services_sub_org ON services(sub_organization_id)`);

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
        source TEXT NULL,
        stage TEXT NOT NULL DEFAULT 'new',
        session_id TEXT NULL,
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
        CHECK (stage IN ('new','qualified','scheduled','converted','lost','inactive'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_leads_org ON leads(organization_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_leads_org_phone ON leads(organization_id, phone) WHERE phone IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_leads_org_public_id ON leads(organization_id, public_id)`);
    await queryRunner.query(`CREATE INDEX idx_leads_org_stage ON leads(organization_id, stage)`);
    await queryRunner.query(`CREATE INDEX idx_leads_org_session ON leads(organization_id, session_id)`);

    await queryRunner.query(`
      CREATE TABLE lead_attributes (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        key TEXT NOT NULL,
        value TEXT NULL,
        source TEXT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_lead_attributes_org ON lead_attributes(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_lead_attributes_lead ON lead_attributes(lead_id)`);

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
        UNIQUE (key_hash)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_api_keys_org ON api_keys(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_api_keys_revoked ON api_keys(revoked_at)`);

    await queryRunner.query(`
      CREATE TABLE chats (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        app TEXT NULL,
        conversation_id TEXT NULL,
        phone TEXT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_message_at TIMESTAMPTZ NULL,
        UNIQUE (public_id),
        CHECK (status IN ('open','closed','archived'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_chats_org ON chats(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_chats_lead ON chats(lead_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_chats_org_conversation ON chats(organization_id, conversation_id) WHERE conversation_id IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE chat_messages (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        conversation_id TEXT NULL,
        direction TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        payload JSONB NOT NULL,
        bot_message TEXT NULL,
        user_message TEXT NULL,
        phone TEXT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        data TEXT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (direction IN ('in','out','system'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_org ON chat_messages(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id, sent_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_lead ON chat_messages(lead_id, sent_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_payload ON chat_messages USING GIN(payload)`);

    await queryRunner.query(`
      CREATE TABLE lead_service_links (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        relation TEXT NOT NULL,
        source TEXT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (lead_id, service_id, relation),
        CHECK (relation IN ('interested','desired','purchased','recommended'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_lead_service_links_org ON lead_service_links(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_lead_service_links_sub ON lead_service_links(sub_organization_id)`);

    await queryRunner.query(`
      CREATE TABLE lead_service_events (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        relation TEXT NOT NULL,
        source TEXT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (relation IN ('interested','desired','purchased','recommended'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_lead_service_events_org ON lead_service_events(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_lead_service_events_lead_ts ON lead_service_events(lead_id, ts DESC)`);

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
    await queryRunner.query(`CREATE INDEX idx_documents_sub_org ON documents(sub_organization_id)`);

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
    await queryRunner.query(`CREATE INDEX idx_professionals_sub ON professionals(sub_organization_id)`);

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
        status TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_agenda_org_start ON agenda(organization_id, start_at)`);
    await queryRunner.query(`CREATE INDEX idx_agenda_lead_start ON agenda(lead_id, start_at)`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sub_organization_id BIGINT NULL REFERENCES sub_organizations(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        chat_id BIGINT NULL REFERENCES chats(id) ON DELETE SET NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        read_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_org_created ON notifications(organization_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_org_read ON notifications(organization_id, read_at)`);

    await queryRunner.query(`
      CREATE TABLE tokens (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
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
    await queryRunner.query(`CREATE INDEX idx_tokens_org_created ON tokens(organization_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_tokens_lead_created ON tokens(lead_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE form_submissions (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        form_schema_id BIGINT NULL,
        payload JSONB NOT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (public_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_form_submissions_org ON form_submissions(organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_form_submissions_lead ON form_submissions(lead_id)`);

    await queryRunner.query(`
      CREATE TABLE n8n_chat_histories (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id BIGINT NULL REFERENCES leads(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        message JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_n8n_histories_org_session ON n8n_chat_histories(organization_id, session_id)`);
    await queryRunner.query(`CREATE INDEX idx_n8n_histories_lead ON n8n_chat_histories(lead_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS n8n_chat_histories`);
    await queryRunner.query(`DROP TABLE IF EXISTS form_submissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS agenda`);
    await queryRunner.query(`DROP TABLE IF EXISTS professionals`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_service_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_service_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS chats`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_attributes`);
    await queryRunner.query(`DROP TABLE IF EXISTS leads`);
    await queryRunner.query(`DROP TABLE IF EXISTS services`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_preferences`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS sub_organizations`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);

    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
