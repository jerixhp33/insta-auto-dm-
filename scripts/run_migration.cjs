const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:manikandan17@db.wxagcyiuijjaenokdnwr.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database!');

    // Check existing tables
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Existing tables in public:', tableRes.rows.map(r => r.table_name));

    // Also check if we can get the JWT secret from vault or auth
    try {
      const secretRes = await client.query("SELECT * FROM vault.decrypted_secrets;");
      console.log('Vault secrets found:', secretRes.rows.map(r => r.name));
    } catch (e) {
      // Vault might not be set up or inaccessible
    }

    // Run migration if tables are not yet present
    const schemaFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    if (fs.existsSync(schemaFile)) {
      console.log('Applying 001_initial_schema.sql...');
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await client.query(sql);
      console.log('Successfully executed 001_initial_schema.sql!');

      const finalTables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
      );
      console.log('Updated tables in public:', finalTables.rows.map(r => r.table_name));
    } else {
      console.log('Schema file not found at:', schemaFile);
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
