import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientOnboardingService, ClientOnboardingData, OnboardingResult } from '../services/client-onboarding.service';

class OnboardClientDto {
  clientName: string;
  businessType: string;
  phone?: string;
  email?: string;
  channels: string[];
  botPlatform: string;
}

@ApiTags('Client Onboarding')
@Controller('admin/onboarding')
export class ClientOnboardingController {
  constructor(
    private readonly onboardingService: ClientOnboardingService,
  ) {}

  @Post('new-client')
  @ApiOperation({ 
    summary: 'Onboarding completo de novo cliente',
    description: `
    Executa todo o processo de configuração para um novo cliente:
    1. Gera organization_id único
    2. Cria API Key específica
    3. Retorna instruções de configuração
    4. Fornece comandos de teste
    
    ⚠️ A API Key só é mostrada UMA VEZ!
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Cliente configurado com sucesso',
    schema: {
      example: {
        organizationId: 123456,
        apiKey: "bridge_123456_1729600000000_prod",
        hmacSecret: "bridge_hmac_123456_1729600000000_abc",
        setupInstructions: "# Instruções detalhadas...",
        webhookUrls: {
          leadUpsert: "https://api.seudominio.com/ingest/lead-upsert",
          leadAttribute: "https://api.seudominio.com/ingest/lead-attribute",
          message: "https://api.seudominio.com/ingest/message"
        },
        testCommands: ["curl -X POST ..."]
      }
    }
  })
  async onboardNewClient(
    @Body() clientData: OnboardClientDto
  ): Promise<OnboardingResult> {
    return this.onboardingService.onboardNewClient(clientData);
  }
}