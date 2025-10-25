import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeadServiceEvents1729549000000 implements MigrationInterface {
  name = 'AddLeadServiceEvents1729549000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lead_service_events" (
        "id" BIGSERIAL NOT NULL,
        "public_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" bigint NOT NULL,
        "lead_id" bigint NOT NULL,
        "service_id" bigint NOT NULL,
        "relation" text NOT NULL,
        "source" text,
        "ts" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead_service_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lse_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lse_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lead_service_events_public_id" ON "lead_service_events" ("public_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_events_org" ON "lead_service_events" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_events_lead" ON "lead_service_events" ("lead_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_events_service" ON "lead_service_events" ("service_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lead_service_events_org_lead_ts" ON "lead_service_events" ("organization_id","lead_id","ts")`);

    // Migrate existing service_event attributes into events table (best-effort)
    await queryRunner.query(`
      INSERT INTO lead_service_events (organization_id, lead_id, service_id, relation, source, ts)
      SELECT
        la.organization_id,
        la.lead_id,
        s.id as service_id,
        COALESCE((la.value::jsonb ->> 'relation'), 'desired') as relation,
        COALESCE((la.value::jsonb ->> 'source'), la.source) as source,
        COALESCE((la.value::jsonb ->> 'ts')::timestamptz, la.ts) as ts
      FROM lead_attributes la
      JOIN services s ON s.public_id::text = (la.value::jsonb ->> 'service_public_id')
      WHERE la.key = 'service_event'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_service_events"`);
  }
}
