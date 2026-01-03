import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentIndexes1735948800000 implements MigrationInterface {
  name = 'AddAppointmentIndexes1735948800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_metadata_lead_id ON documents ((metadata->>'lead_id'))`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_documents_metadata_start_time ON documents (((metadata->>'start_time')::timestamptz))`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_metadata_status ON documents ((metadata->>'status'))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_org_suborg ON documents(organization_id, sub_organization_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_org_suborg`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_metadata_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_metadata_start_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_documents_metadata_lead_id`);
  }
}
