const fs = require('fs');
const path = require('path');

const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = 'ntkdkblfpjhjqidjhsgb';
const SCHEMA_FILE = path.join(__dirname, '../supabase/schema.sql');

async function applyMigration() {
  try {
    const sqlContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
    console.log(`Mengirim skema SQL ke Supabase (${sqlContent.length} bytes)...`);

    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sqlContent }),
    });

    if (res.status === 201 || res.status === 200) {
      console.log('✅ Skema SQL berhasil di-update secara otomatis ke database live Supabase!');
    } else {
      const errText = await res.text();
      console.error(`❌ Gagal update database. Status: ${res.status}`, errText);
    }
  } catch (err) {
    console.error('Error saat update database:', err);
  }
}

applyMigration();
