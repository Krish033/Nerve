import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Global Middleware
  app.use(cookieParser());
  console.log('[Main] CookieParser initialized');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 4000;

  // Connect Microservices (RabbitMQ)
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'notification_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
  console.log(`Gateway is running on: http://localhost:${port}`);
}
bootstrap();
