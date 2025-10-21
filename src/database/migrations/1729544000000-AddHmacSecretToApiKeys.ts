import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHmacSecretToApiKeys1729544000000 implements MigrationInterface {
  name = 'AddHmacSecretToApiKeys1729544000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add hmac_secret column to api_keys table
    await queryRunner.query(`
      ALTER TABLE "api_keys" 
      ADD COLUMN "hmac_secret" character varying(255)
    `);

    // Generate unique HMAC secrets for existing API keys
    await queryRunner.query(`
      UPDATE "api_keys" 
      SET "hmac_secret" = 'bridge_hmac_' || "organization_id" || '_' || extract(epoch from now()) || '_' || substr(md5(random()::text), 1, 8)
      WHERE "hmac_secret" IS NULL
    `);

    // Make hmac_secret NOT NULL after population
    await queryRunner.query(`
      ALTER TABLE "api_keys" 
      ALTER COLUMN "hmac_secret" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys" 
      DROP COLUMN "hmac_secret"
    `);
  }
}