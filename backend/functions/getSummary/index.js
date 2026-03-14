const { Client } = require('pg');
const Anthropic = require('@anthropic-ai/sdk').default;

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
      'SELECT extracted_text, summary FROM documents WHERE id=$1',
      [docId]
    );

    if (rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    // Return cached summary if it already exists
    if (rows[0].summary) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: rows[0].summary })
      };
    }

    // No cached summary — call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Summarize the following academic text in 3-5 bullet points:\n\n'
          + rows[0].extracted_text.slice(0, 10000)
      }]
    });
    const summary = msg.content[0].text;

    // Cache the summary
    await db.query(
      'UPDATE documents SET summary=$1 WHERE id=$2',
      [summary, docId]
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary })
    };
  } catch (err) {
    console.error('getSummary error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await db.end();
  }
};