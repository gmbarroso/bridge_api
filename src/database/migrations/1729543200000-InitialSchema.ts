import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1729543200000 implements MigrationInterface {
  name = 'InitialSchema1729543200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "key_hash" character varying(255) NOT NULL,
        "name" character varying(100),
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "rotated_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_key_hash" UNIQUE ("key_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "suborganization_id" bigint,
        "name" text,
        "phone" text,
        "email" text,
        "source" text,
        "stage" text NOT NULL DEFAULT 'new',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_message_at" TIMESTAMP WITH TIME ZONE,
        "first_response_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_leads" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "lead_id" bigint NOT NULL,
        "channel" text NOT NULL,
        "app" text,
        "conversation_id" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_message_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "conversation_id" bigint NOT NULL,
        "direction" text NOT NULL,
        "type" text NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "lead_attributes" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "lead_id" bigint NOT NULL,
        "key" text NOT NULL,
        "value" text,
        "source" text,
        "ts" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead_attributes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lead_attributes_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "form_submissions" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "lead_id" bigint NOT NULL,
        "form_schema_id" bigint,
        "payload" jsonb NOT NULL,
        "ts" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_form_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_form_submissions_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_keys_public_id" ON "api_keys" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_organization_id" ON "api_keys" ("organization_id")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_leads_public_id" ON "leads" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_leads_organization_id" ON "leads" ("organization_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_leads_org_phone" ON "leads" ("organization_id", "phone") WHERE "phone" IS NOT NULL`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_conversations_public_id" ON "conversations" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_organization_id" ON "conversations" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_lead_id" ON "conversations" ("lead_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_conversations_org_app_convid" ON "conversations" ("organization_id", "app", "conversation_id") WHERE "app" IS NOT NULL AND "conversation_id" IS NOT NULL`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_messages_public_id" ON "messages" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_organization_id" ON "messages" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_conversation_id" ON "messages" ("conversation_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_created_at" ON "messages" ("created_at")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_lead_attributes_public_id" ON "lead_attributes" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lead_attributes_organization_id" ON "lead_attributes" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lead_attributes_lead_id" ON "lead_attributes" ("lead_id")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_form_submissions_public_id" ON "form_submissions" ("public_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_form_submissions_organization_id" ON "form_submissions" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_form_submissions_lead_id" ON "form_submissions" ("lead_id")`);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW lead_unified_view AS
      SELECT
        l.id,
        l.public_id,
        l.organization_id,
        l.suborganization_id,
        l.name,
        l.phone,
        l.email,
        l.source,
        l.stage,
        l.created_at,
        l.last_message_at,
        MAX(CASE WHEN a.key = 'servico_desejado' THEN a.value END) AS servico_desejado,
        MAX(CASE WHEN a.key = 'bairro' THEN a.value END) AS bairro,
        MAX(CASE WHEN a.key = 'plano_fidelidade' THEN a.value END) AS plano_fidelidade
      FROM leads l
      LEFT JOIN lead_attributes a ON a.lead_id = l.id
      GROUP BY l.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "lead_unified_view"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}