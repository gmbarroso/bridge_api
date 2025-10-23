import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/database/entities/organization.entity';
import { User } from '../src/database/entities/user.entity';
import { PasswordResetToken } from '../src/database/entities/password-reset-token.entity';

/**
 * E2E: Reset de senha (token) -> trocar senha -> login
 */

describe('Reset Password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let email: string;
  let oldPassword = 'SenhaAntiga!1';
  let newPassword = 'SenhaNova!2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    const org = await orgRepo.save({ name: `Reset Org ${Date.now()}` });

    email = `reset_${Date.now()}@test.com`;
    const password_hash = await argon2.hash(oldPassword, { type: argon2.argon2id });
    await userRepo.save({
      email,
      name: 'Reset User',
      password_hash,
      password_algo: 'argon2id',
      password_salt: '',
      email_verified_at: new Date(),
      organization_id: org.id,
      suborganization_id: null,
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reset password using token and login with the new one', async () => {
    const prRepo = dataSource.getRepository(PasswordResetToken);
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    // Cria token diretamente (simula e-mail enviado)
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prRepo.save({ user_id: user!.id, token_hash: hash, expires_at: expiresAt, used_at: null });

    // Reset
    const resetRes = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: raw, password: newPassword })
      .expect(201);

    expect(resetRes.body.ok).toBe(true);

    // Login com a senha nova
    const loginNew = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(201);

    expect(loginNew.body.accessToken).toBeDefined();

    // Login com a senha antiga deve falhar
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);
  });
});
