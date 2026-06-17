// Try with proper Supavisor username format: postgres.<project-ref>
const { Client } = require('pg');

const projectRef = 'lzwspnhvqimaojtdecwt';
const password = 'Ckia52762622827';

const regions = [
  'aws-0-us-east-1', 'aws-0-us-west-1', 'aws-0-us-east-2',
  'aws-0-eu-west-1', 'aws-0-eu-west-2', 'aws-0-eu-central-1',
  'aws-0-ap-southeast-1', 'aws-0-ap-northeast-1', 'aws-0-ap-south-1',
];

async function tryRegion(region) {
  const host = `${region}.pooler.supabase.com`;
  const username = `postgres.${projectRef}`;
  const connectionString = `postgresql://${username}:${password}@${host}:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, servername: host },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT current_database() as db');
    await client.end();
    return { ok: true, db: rows[0].db };
  } catch (e) {
    return { ok: false, err: e.message.slice(0, 150) };
  }
}

async function main() {
  for (const region of regions) {
    process.stdout.write(`Trying ${region}... `);
    const r = await tryRegion(region);
    if (r.ok) {
      console.log(`✓ OK — db: ${r.db}`);
      console.log(`\n✅ WORKING REGION: ${region}`);
      console.log(`   Pooler URL: postgresql://postgres.${projectRef}:****@${region}.pooler.supabase.com:6543/postgres`);
      return region;
    } else {
      console.log(`✗ ${r.err}`);
    }
  }
  console.log('\n❌ No working region found');
  return null;
}

main();
