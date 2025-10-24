import 'reflect-metadata';
import { config } from 'dotenv';
import dataSource from '../../config/database.config';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import * as argon2 from 'argon2';

config();

async function main() {
  const args = process.argv.slice(2);
  // Allow CLI args or fallback to env vars
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];
  const passwordArg = args.find((a) => a.startsWith('--password='))?.split('=')[1];
  const orgArg = args.find((a) => a.startsWith('--org='))?.split('=')[1];

  const email = emailArg || process.env.INITIAL_ADMIN_EMAIL;
  const password = passwordArg || process.env.INITIAL_ADMIN_PASSWORD;
  const orgName = orgArg || process.env.INITIAL_ORG_NAME || 'Acme Inc';

  if (!email || !password) {
    console.error('Missing credentials. Provide --email and --password or set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in env.');
    process.exit(1);
  }

  await dataSource.initialize();
  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);

  // Upsert organization by name
  let org = await orgRepo.findOne({ where: { name: orgName } });
  if (!org) {
    // Defensive: ensure sequence is aligned to MAX(id) before inserting
    await dataSource.query(`
      SELECT setval(
        pg_get_serial_sequence('organizations','id'),
        COALESCE((SELECT MAX(id) FROM organizations), 0),
        true
      )
    `);
    org = await orgRepo.save({ name: orgName } as Partial<Organization>);
    console.log(`Created organization: ${orgName} (id=${org.id})`);
  } else {
    console.log(`Using existing organization: ${orgName} (id=${org.id})`);
  }

  // Upsert user by email
  let user = await userRepo.findOne({ where: { email } });
  const password_hash = await argon2.hash(password);

  if (!user) {
    user = userRepo.create({
      email,
      name: 'Admin',
      password_hash,
      password_algo: 'argon2id',
      password_salt: '',
      email_verified_at: new Date(),
      organization_id: org.id,
      role: 'admin',
    });
    user = await userRepo.save(user);
    console.log(`Created admin user: ${email} (id=${user.id})`);
  } else {
    user.password_hash = password_hash;
    user.password_algo = 'argon2id';
    user.password_salt = '';
    user.email_verified_at = user.email_verified_at || new Date();
    user.organization_id = org.id;
    user.role = 'admin';
    await userRepo.save(user);
    console.log(`Updated existing user to admin and verified: ${email} (id=${user.id})`);
  }

  console.log('Done. You can now login with these credentials.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
