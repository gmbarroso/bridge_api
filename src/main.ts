import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function createApp() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS with restrictions
  const allowedOrigins = configService.get<string>('cors.allowedOrigins', 'http://localhost:3000');
  app.enableCors({
    origin: allowedOrigins.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-timestamp',
      'x-signature',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Bridge API')
    .setDescription('Bridge API - Sistema de Ingestão de Leads')
    .setVersion('1.0')
    .addApiKey({
      type: 'apiKey',
      name: 'x-api-key',
      in: 'header',
      description: 'Organization API Key for bot authentication',
    })
    .addServer('http://localhost:3000', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  
  const port = configService.get<number>('port', 3000);
  await app.listen(port);

  console.log(`🚀 Bridge API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

if (require.main === module) {
  bootstrap();
}

export default async (req: any, res: any) => {
  const app = await createApp();
  await app.init();
  const server = app.getHttpAdapter().getInstance();
  return server(req, res);
};
