import { createHash } from 'crypto';
import dataSource from '../../config/database.config';

async function generateSpecificApiKey() {
  await dataSource.initialize();

  const args = process.argv.slice(2);
  const orgArg = args.find((a) => a.startsWith('--org='))?.split('=')[1];
  const keyArg = args.find((a) => a.startsWith('--key='))?.split('=')[1];
  const nameArg = args.find((a) => a.startsWith('--name='))?.split('=')[1];

  const organizationId = Number(orgArg || process.env.API_KEY_ORG_ID || 1);
  if (!organizationId || Number.isNaN(organizationId)) {
    console.error('Provide a valid organization id via --org=ID or API_KEY_ORG_ID env var.');
    process.exit(1);
  }

  const apiKey = keyArg || `bridge_${organizationId}_${Date.now()}_manual`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const hmacSecret = `bridge_hmac_${organizationId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const name = nameArg || 'Manual API Key';
  const permissions = JSON.stringify({ scope: 'ingest' });

  const result = await dataSource.query(
    `INSERT INTO api_keys (organization_id, key_hash, name, hmac_secret, permissions)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (organization_id)
     DO UPDATE SET
       key_hash = EXCLUDED.key_hash,
       name = EXCLUDED.name,
       hmac_secret = EXCLUDED.hmac_secret,
       permissions = EXCLUDED.permissions,
       updated_at = now(),
       revoked_at = NULL,
       last_used_at = NULL
     RETURNING id, public_id, key_hash, hmac_secret, organization_id, name`,
    [organizationId, keyHash, name, hmacSecret, permissions]
  );

  const row = result[0];
  console.log('🔑 API Key pronta:');
  console.log(`API Key (plaintext): ${apiKey}`);
  console.log(`Organization ID: ${row.organization_id}`);
  console.log(`Key Hash: ${row.key_hash}`);
  console.log(`HMAC Secret: ${row.hmac_secret}`);
  console.log(`Name: ${row.name}`);

  await dataSource.destroy();
}

generateSpecificApiKey().catch(console.error);
