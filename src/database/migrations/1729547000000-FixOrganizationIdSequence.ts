import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOrganizationIdSequence1729547000000 implements MigrationInterface {
  name = 'FixOrganizationIdSequence1729547000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('organizations','id'),
        COALESCE((SELECT MAX(id) FROM organizations), 0),
        true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op safe down; optionally reset to 1 if table empty
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('organizations','id'),
        COALESCE((SELECT MAX(id) FROM organizations), 0),
        true
      )
    `);
  }
}
