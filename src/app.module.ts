import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { AuthModule } from './modules/auth/auth.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { BffModule } from './modules/bff/bff.module';
import * as entities from './database/entities';
import { MetricsController } from './common/observability/metrics.controller';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: Object.values(entities),
        synchronize: false,
        logging: configService.get('environment') === 'development',
        ssl: configService.get('database.ssl'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    IngestModule,
    BffModule,
    CommonModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [AppService],
})
export class AppModule {}
