import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponse } from '../../../common/swagger/errors';
import { OnboardingResponse } from '../../../common/swagger/success';
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
@ApiExtraModels(ErrorResponse)
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
  @ApiBody({
    description: 'Dados do novo cliente e plataforma/bot usado',
    schema: { example: { clientName: 'Salão da Maria', businessType: 'Salão de Beleza', phone: '+5511999888777', email: 'contato@salaodamaria.com', channels: ['whatsapp','instagram'], botPlatform: 'evolution' } }
  })
  @ApiResponse({ status: 201, description: 'Cliente configurado com sucesso', schema: { $ref: getSchemaPath(OnboardingResponse) } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { $ref: getSchemaPath(ErrorResponse) } })
  @ApiResponse({ status: 400, description: 'Bad Request: validação dos dados' })
  async onboardNewClient(
    @Body() clientData: OnboardClientDto
  ): Promise<OnboardingResult> {
    return this.onboardingService.onboardNewClient(clientData);
  }
}