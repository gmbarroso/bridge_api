import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServicesAndLinks1729548000000 implements MigrationInterface {
  name = 'AddServicesAndLinks1729548000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "suborganization_id" bigint,
        "slug" text NOT NULL,
        "title" text NOT NULL,
        "category" text NOT NULL,
        "audience" text NOT NULL,
        "service_type" text NOT NULL,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "source_url" text,
        "content" text,
        "status" text NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_services_public_id" ON "services" ("public_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_services_organization_id" ON "services" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_services_suborganization_id" ON "services" ("suborganization_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_services_org_slug" ON "services" ("organization_id", "slug")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lead_service_links" (
        "id" BIGSERIAL NOT NULL,
        "organization_id" bigint NOT NULL,
        "lead_id" bigint NOT NULL,
        "service_id" bigint NOT NULL,
        "relation" text NOT NULL,
        "source" text,
        "ts" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead_service_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lead_service_links_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lead_service_links_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_links_org" ON "lead_service_links" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_links_lead" ON "lead_service_links" ("lead_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_links_service" ON "lead_service_links" ("service_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lead_service_links_unique" ON "lead_service_links" ("lead_id","service_id","relation")`);

    // Atualizar a view para considerar o serviço desejado via lead_service_links, mantendo compat com atributo
    await queryRunner.query(`
      DROP VIEW IF EXISTS "lead_unified_view";
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
        COALESCE(
          (
            SELECT s.slug
            FROM lead_service_links lsl
            JOIN services s ON s.id = lsl.service_id
            WHERE lsl.lead_id = l.id AND lsl.relation = 'desired'
            ORDER BY lsl.ts DESC
            LIMIT 1
          ),
          MAX(CASE WHEN a.key = 'servico_desejado' THEN a.value END)
        ) AS servico_desejado,
        MAX(CASE WHEN a.key = 'bairro' THEN a.value END) AS bairro,
        MAX(CASE WHEN a.key = 'plano_fidelidade' THEN a.value END) AS plano_fidelidade
      FROM leads l
      LEFT JOIN lead_attributes a ON a.lead_id = l.id
      GROUP BY l.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "lead_unified_view"`);
    // restore original view definition (without services)
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

    await queryRunner.query(`DROP TABLE IF EXISTS "lead_service_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
  }
}
