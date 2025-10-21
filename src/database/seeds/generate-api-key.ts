import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import dataSource from '../../config/database.config';

async function generateDevApiKey() {
  await dataSource.initialize();

  const organizationId = 1; // Organization de desenvolvimento
  const apiKey = `bridge_${organizationId}_${Date.now()}_dev`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  await dataSource.query(`
    INSERT INTO api_keys (organization_id, key_hash, name, status)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (key_hash) DO NOTHING
  `, [organizationId, keyHash, 'Development API Key', 'active']);

  console.log('🔑 Development API Key generated:');
  console.log(`API Key: ${apiKey}`);
  console.log(`Organization ID: ${organizationId}`);
  console.log(`Key Hash: ${keyHash}`);

  await dataSource.destroy();
}

generateDevApiKey().catch(console.error);