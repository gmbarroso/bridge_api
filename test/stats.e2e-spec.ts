import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/database/entities/organization.entity';
import { User } from '../src/database/entities/user.entity';

describe('Stats (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let org: Organization;
  const password = 'Test@123456';
  const email = `stats_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);

    org = await orgRepo.save({ name: `E2E Stats Org ${Date.now()}` });

    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    await userRepo.save({
      email,
      name: 'Stats User',
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

  it('summary e leads-trend com JWT', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const token = loginRes.body.accessToken;

    const summaryRes = await request(app.getHttpServer())
      .get('/bff/stats/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summaryRes.body).toHaveProperty('totalLeads');
    expect(summaryRes.body).toHaveProperty('leadsByStage');

    const trendRes = await request(app.getHttpServer())
      .get('/bff/stats/leads-trend')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(trendRes.body.points)).toBe(true);
  });
});
