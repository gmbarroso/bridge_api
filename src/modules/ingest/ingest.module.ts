import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { Conversation } from '../../database/entities/conversation.entity';
import { Message } from '../../database/entities/message.entity';
import { LeadAttribute } from '../../database/entities/lead-attribute.entity';
import { AuthModule } from '../auth/auth.module';
import { Service } from '../../database/entities/service.entity';
import { LeadServiceLink } from '../../database/entities/lead-service-link.entity';
import { IngestController } from './controllers/ingest.controller';
import { IngestService } from './services/ingest.service';
import { IdResolverService } from './services/id-resolver.service';
import { ApiKey } from '../../database/entities/api-key.entity';
import { Organization } from '../../database/entities/organization.entity';
import { VerificationToken } from '../../database/entities/verification-token.entity';
import { ApiKeyManagementController } from './controllers/api-key-management.controller';
import { ClientOnboardingController } from './controllers/client-onboarding.controller';
import { ApiKeyManagementService } from './services/api-key-management.service';
import { ClientOnboardingService } from './services/client-onboarding.service';
import { ServicesAdminController } from './controllers/services-admin.controller';
import { LeadServiceEvent } from '../../database/entities/lead-service-event.entity';
import { M2MLeadsController } from './controllers/m2m-leads.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Conversation,
      Message,
      LeadAttribute,
      Service,
      LeadServiceLink,
      LeadServiceEvent,
      ApiKey,
      Organization,
      VerificationToken,
    ]),
    AuthModule,
  ],
  controllers: [IngestController, ApiKeyManagementController, ClientOnboardingController, ServicesAdminController, M2MLeadsController],
  providers: [IngestService, IdResolverService, ApiKeyManagementService, ClientOnboardingService],
  exports: [IngestService, IdResolverService],
})
export class IngestModule {}