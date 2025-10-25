import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/database/entities/organization.entity';
import { User } from '../src/database/entities/user.entity';

/**
 * E2E: Auth + BFF (JWT)
 * Pré-requisitos para rodar localmente:
 * - Banco de dados configurado e migrations aplicadas
 * - Variáveis: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
 */

describe('Auth + BFF (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org: Organization;
  const password = 'Test@123456';
  const email = `e2e_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Seed: Organization + User verificado
    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    org = await orgRepo.save({ name: `E2E Org ${Date.now()}` });

    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    await userRepo.save({
      email,
      name: 'E2E User',
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

  it('login -> access + refresh, acessar /bff/leads com Bearer', async () => {
    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();

    // Acesso ao BFF com JWT
    const bffRes = await request(app.getHttpServer())
      .get('/bff/leads')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(bffRes.body.items)).toBe(true);

    // Refresh (rotação)
    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginRes.body.refreshToken })
      .expect(201);

    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toEqual(loginRes.body.refreshToken);

    // Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(201);
  });
});
