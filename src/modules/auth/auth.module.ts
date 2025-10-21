import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class AuthModule {}