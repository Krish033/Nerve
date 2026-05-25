const amqp = require('amqplib');
const { Client } = require('pg');

async function sendTestNotification() {
  // Database configuration from your .env
  const dbClient = new Client({
    connectionString: "postgresql://postgres:Krish%40033@localhost:5432/Nurve"
  });

  const RABBITMQ_URL = 'amqp://localhost:5672';
  const QUEUE_NAME = 'notification_queue';

  try {
    console.log(' [i] Connecting to database...');
    await dbClient.connect();
    
    // Find a valid user
    const res = await dbClient.query('SELECT id, name FROM users LIMIT 1');
    const user = res.rows[0];

    if (!user) {
      console.error(' [!] No users found in database.');
      process.exit(1);
    }

    console.log(` [i] Target User: ${user.name} (${user.id})`);

    // Connect to RabbitMQ
    console.log(' [i] Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // NestJS Microservice Event Pattern
    const event = {
      pattern: 'notification.send',
      data: {
        userId: user.id,
        title: 'ANOMALY_DETECTED: MATRIX_SYNC',
        message: 'A temporary fluctuation in the core identity matrix has been stabilized.',
        type: 'WARNING',
        metadata: { 
          node: 'CORE-01',
          timestamp: new Date().toISOString()
        }
      }
    };

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)));
    console.log(' [x] Test notification dispatched successfully.');
    
    setTimeout(async () => {
      await dbClient.end();
      await connection.close();
      console.log(' [i] Connections closed.');
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error(' [!] Error:', error.message);
    process.exit(1);
  }
}

sendTestNotification();
