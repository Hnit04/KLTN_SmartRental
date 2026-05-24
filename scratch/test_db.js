const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mnuoprhnzywzszwoodoz:Tinh123.%40123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected to DB!");
  const res = await client.query('SELECT * FROM room_reports WHERE id = 8');
  console.log("Report 8:", res.rows);
  
  if (res.rows.length > 0) {
    const reporterRes = await client.query('SELECT * FROM users WHERE id = $1', [res.rows[0].reporter_id]);
    console.log("Reporter:", reporterRes.rows);
    
    const roomRes = await client.query('SELECT * FROM rooms WHERE id = $1', [res.rows[0].room_id]);
    console.log("Room:", roomRes.rows);
  }
  await client.end();
}

run().catch(console.error);
