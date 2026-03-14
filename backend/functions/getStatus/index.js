const { Client } = require('pg');

exports.handler = async (event) => {
  const docId = event.pathParameters?.docId;

  if (!docId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing docId' })
    };
  }

   const db = new Client({connectionString: process.env.DATABASE_URL,
                        ssl: { rejectUnauthorized: false }
   });  
   
   await db.connect();

  try {
    const { rows } = await db.query(
      'SELECT status, audio_url FROM documents WHERE id=$1',
      [docId]
    );

    if (rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows[0])
    };
  } finally {
    await db.end();
  }
};