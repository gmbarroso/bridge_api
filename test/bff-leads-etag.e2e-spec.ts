import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/database/entities/organization.entity';
import { User } from '../src/database/entities/user.entity';

/**
 * E2E: ETag no /bff/leads
 */

describe('BFF Leads ETag (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Seed org + user
    const orgRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);
    const org = await orgRepo.save({ name: `ETag Org ${Date.now()}` });

    const email = `etag_${Date.now()}@test.com`;
    const password = 'SenhaF0rte!';
    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    await userRepo.save({
      email,
      name: 'ETag User',
      password_hash,
      password_algo: 'argon2id',
      password_salt: '',
      email_verified_at: new Date(),
      organization_id: org.id,
      suborganization_id: null,
      role: 'admin',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return ETag and then 304 on If-None-Match', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/bff/leads?limit=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const etag = res1.header['etag'];
    expect(etag).toBeDefined();

    await request(app.getHttpServer())
      .get('/bff/leads?limit=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('If-None-Match', etag)
      .expect(304);
  });
});
