const { Client } = require('pg');
const Anthropic = require('@anthropic-ai/sdk').default;

exports.handler = async (event) => {
  const docId = event.pathParameters?.docId;
  const { question } = JSON.parse(event.body);

  if (!docId || !question) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing docId or question' })
    };
  }

  const db = new Client({connectionString: process.env.DATABASE_URL,
                        ssl: { rejectUnauthorized: false }
   });  
    await db.connect();
  try {
    const { rows } = await db.query(
      'SELECT extracted_text FROM documents WHERE id=$1',
      [docId]
    );

    if (rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Using only the document below, answer this question: '
          + question
          + '\n\nDocument:\n'
          + rows[0].extracted_text.slice(0, 10000)
      }]
    });
    const answer = msg.content[0].text;

    // Log Q&A to database
    await db.query(
      'INSERT INTO qa_logs (doc_id, question, answer) VALUES ($1, $2, $3)',
      [docId, question, answer]
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    };
  } catch (err) {
    console.error('qaDocument error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await db.end();
  }
};