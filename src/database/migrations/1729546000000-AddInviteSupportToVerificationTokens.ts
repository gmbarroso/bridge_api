import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteSupportToVerificationTokens1729546000000 implements MigrationInterface {
  name = 'AddInviteSupportToVerificationTokens1729546000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tornar user_id opcional para suportar convites sem usuário ainda
    await queryRunner.query(`ALTER TABLE verification_tokens ALTER COLUMN user_id DROP NOT NULL`);

    // Ampliar tipos permitidos no CHECK constraint do campo type
    await queryRunner.query(`ALTER TABLE verification_tokens DROP CONSTRAINT IF EXISTS verification_tokens_type_check`);
    await queryRunner.query(`ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_type_check CHECK (type IN ('email_verify','invite'))`);

    // Campos específicos para convites
    await queryRunner.query(`ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS invite_email TEXT`);
    await queryRunner.query(`ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS invite_role TEXT CHECK (invite_role IN ('viewer','agent','admin'))`);
    await queryRunner.query(`ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS invited_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL`);

    // Índices auxiliares (lookup por email do convite e organização)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_verification_tokens_invite_email ON verification_tokens(invite_email)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_verification_tokens_org ON verification_tokens(organization_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_verification_tokens_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_verification_tokens_invite_email`);

    await queryRunner.query(`ALTER TABLE verification_tokens DROP COLUMN IF EXISTS invited_by_user_id`);
    await queryRunner.query(`ALTER TABLE verification_tokens DROP COLUMN IF EXISTS invite_role`);
    await queryRunner.query(`ALTER TABLE verification_tokens DROP COLUMN IF EXISTS invite_email`);
    await queryRunner.query(`ALTER TABLE verification_tokens DROP COLUMN IF EXISTS organization_id`);

    // Restaurar constraint apenas com email_verify
    await queryRunner.query(`ALTER TABLE verification_tokens DROP CONSTRAINT IF EXISTS verification_tokens_type_check`);
    await queryRunner.query(`ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_type_check CHECK (type IN ('email_verify'))`);

    // Tornar user_id novamente obrigatório
    await queryRunner.query(`ALTER TABLE verification_tokens ALTER COLUMN user_id SET NOT NULL`);
  }
}
