const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { Client } = require('pg');

exports.handler = async (event) => {
  const { s3Key, filename } = JSON.parse(event.body);

const db = new Client({ connectionString: process.env.DATABASE_URL,
                        ssl: { rejectUnauthorized: false } });
  await db.connect();

  try {
    // 1. Insert a new document record with status "processing"
    const { rows } = await db.query(
                            'INSERT INTO documents (filename, status) VALUES ($1, $2) RETURNING id',
                            [filename, 'processing']
                            );
    const docId = rows[0].id;

    // TEMPORARY: skip Textract, use hardcoded text for testing
   // const text = "Embedded systems form the computational backbone of modern robotic platforms, providing real-time control and sensor integration capabilities. Most robotic systems rely on ARM-based microcontrollers operating at clock speeds between 48 MHz and 480 MHz. The STM32 family from STMicroelectronics has become a popular choice due to its balance of processing power, peripheral availability, and energy efficiency. The Controller Area Network protocol, originally developed for automotive applications, has found widespread adoption in robotics due to its deterministic timing characteristics and fault tolerance. CAN bus allows multiple nodes to share a single communication medium with priority-based arbitration. Sensor fusion algorithms running on embedded processors must combine data from inertial measurement units, encoders, and proximity sensors to produce accurate state estimates. The Extended Kalman Filter remains the most common approach. Power management in battery-operated robots requires careful attention to duty cycling and sleep modes. Effective power management can extend mission duration by 30 to 50 percent. TensorFlow Lite for Microcontrollers enables neural network inference on devices with as little as 256 kilobytes of flash memory.";


   // 2. Fetch the PDF bytes from S3
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET,
                                                      Key: s3Key
                                                 }));
    const pdfBytes = await obj.Body.transformToByteArray();

    // 3. Run Textract OCR on the PDF
    const textract = new TextractClient({ region: process.env.AWS_REGION });
    const result = await textract.send(new DetectDocumentTextCommand({
      Document: { Bytes: pdfBytes }
    }));

    // 4. Extract all LINE blocks into a single string
    const text = result.Blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text)
      .join(' ');

    // 5. Save extracted text to DB
    await db.query(
      'UPDATE documents SET extracted_text=$1 WHERE id=$2',
      [text, docId]
    );

    // 6. Send SQS message to trigger audio generation
    const sqs = new SQSClient({ region: process.env.AWS_REGION });
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ docId })
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId })
    };
  } catch (err) {
    console.error('uploadPDF error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await db.end();
  }
};