// Drop all existing tables in the Supabase database (IPv4 forced)
const { Client } = require('pg');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const connectionString = 'postgresql://postgres.lzwspnhvqimaojtdecwt:Ckia52762622827@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function dropAllTables() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL (direct IPv4)');
    const { rows } = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`);
    console.log(`Found ${rows.length} tables:`, rows.map(r => r.tablename));
    if (rows.length > 0) {
      await client.query(`SET session_replication_role = 'replica';`);
      for (const row of rows) {
        await client.query(`DROP TABLE IF EXISTS "public"."${row.tablename}" CASCADE;`);
        console.log(`  dropped: ${row.tablename}`);
      }
      await client.query(`SET session_replication_role = 'origin';`);
      const { rows: enumRows } = await client.query(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e';`);
      for (const row of enumRows) {
        await client.query(`DROP TYPE IF EXISTS "public"."${row.typname}" CASCADE;`);
      }
      console.log(`Dropped ${enumRows.length} enum types`);
    } else {
      console.log('No tables to drop');
    }
    await client.end();
    console.log('Done');
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}
dropAllTables();
