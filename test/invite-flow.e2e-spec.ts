import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/database/entities/organization.entity';
import { VerificationToken } from '../src/database/entities/verification-token.entity';

/**
 * E2E: Fluxo de convite → aceitar → login → acessar BFF
 */

describe('Invite Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('accept invite -> login -> access bff', async () => {
    const orgRepo = dataSource.getRepository(Organization);
    const vtRepo = dataSource.getRepository(VerificationToken);

    const org = await orgRepo.save({ name: `Invite Org ${Date.now()}` });

    const email = `invite_${Date.now()}@test.com`;
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await vtRepo.save({
      user_id: null,
      token_hash: hash,
      type: 'invite',
      organization_id: org.id,
      invite_email: email,
      invite_role: 'admin',
      invited_by_user_id: null,
      expires_at: expiresAt,
      used_at: null,
    });

    // Accept invite
    const password = 'SenhaF0rte!';
    const acceptRes = await request(app.getHttpServer())
      .post('/auth/accept-invite')
      .send({ token: raw, name: 'Invited User', password })
      .expect(201);

    expect(acceptRes.body?.user?.email).toBe(email);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(loginRes.body.accessToken).toBeDefined();

    // BFF access
    await request(app.getHttpServer())
      .get('/bff/leads')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);
  });
});
