// Try all Supabase pooler regions to find the right one
const { Client } = require('pg');

const PASSWORD = 'Ckia52762622827';
const REF = 'lzwspnhvqimaojtdecwt';

const regions = [
  'aws-0-eu-central-1',
  'aws-0-us-east-1',
  'aws-0-us-west-1',
  'aws-0-ap-southeast-1',
  'aws-0-ap-northeast-1',
  'aws-0-ap-south-1',
  'aws-0-eu-west-1',
  'aws-0-eu-west-2',
  'aws-0-ca-central-1',
  'aws-0-sa-east-1',
];

async function tryRegion(region, port) {
  const connStr = `postgresql://postgres.${REF}:${PASSWORD}@${region}.pooler.supabase.com:${port}/postgres`;
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const r = await client.query('SELECT current_database() as db, now() as t');
    await client.end();
    return { ok: true, region, port, db: r.rows[0].db };
  } catch (e) {
    return { ok: false, region, port, err: e.message };
  }
}

(async () => {
  console.log('Trying all Supabase pooler regions...');
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const r = await tryRegion(region, port);
      if (r.ok) {
        console.log(`✓ FOUND: ${r.region} port ${r.port} — db=${r.db}`);
        process.exit(0);
      } else {
        console.log(`✗ ${r.region}:${r.port} — ${r.err.substring(0, 80)}`);
      }
    }
  }
  console.log('No region worked');
  process.exit(1);
})();
