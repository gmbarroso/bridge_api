import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ErrorResponse } from './common/swagger/errors';
import {
  MessageResponse,
  TokenPairResponse,
  LoginResponse,
  BffLeadListItem,
  BffLeadListResponse,
  BffCorporateLeadListItem,
  BffCorporateLeadListResponse,
  BffTimelineMessageItem,
  BffTimelineResponse,
  BffAppointmentItem,
  BffAppointmentListResponse,
} from './common/swagger/success';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { UpdateLeadDto } from './modules/bff/dto/leads.dto';
import { CreateAppointmentDto, UpdateAppointmentDto } from './modules/bff/dto/appointments.dto';

let cachedApp: INestApplication;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const allowedOrigins = configService.get<string>('cors.allowedOrigins', '*');
  app.enableCors({
    origin: allowedOrigins === '*' ? true : allowedOrigins.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new RequestLoggerInterceptor(),
  );

  const config = new DocumentBuilder()
    .setTitle('Bridge API')
    .setDescription('Bridge API - Sistema de Ingestão de Leads')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT de acesso para endpoints do BFF/Admin',
      },
      'BearerAuth',
    )
    .addApiKey({
      type: 'apiKey',
      name: 'x-api-key',
      in: 'header',
      description: 'Organization API Key for bot authentication',
    })
    .addServer('https://bridge-api-synthix.vercel.app', 'Production')
    .addServer('http://localhost:3000', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ErrorResponse,
      // Auth
      MessageResponse,
      TokenPairResponse,
      LoginResponse,
      // API Key Management
      // BFF
      BffLeadListItem,
      BffLeadListResponse,
      BffCorporateLeadListItem,
      BffCorporateLeadListResponse,
      BffTimelineMessageItem,
      BffTimelineResponse,
      UpdateLeadDto,
      CreateAppointmentDto,
      UpdateAppointmentDto,
      BffAppointmentItem,
      BffAppointmentListResponse,
    ],
  });
  SwaggerModule.setup('api', app, document, {
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  cachedApp = app;
  
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

// Para desenvolvimento local
if (require.main === module) {
  bootstrap();
}

// Para Vercel (serverless)
export default async (req: any, res: any) => {
  const app = await createApp();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
};
