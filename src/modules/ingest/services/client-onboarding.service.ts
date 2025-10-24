import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyManagementService } from './api-key-management.service';
import { Organization } from '../../../database/entities/organization.entity';
import { VerificationToken } from '../../../database/entities/verification-token.entity';

export interface ClientOnboardingData {
  clientName: string;
  businessType: string;
  phone?: string;
  email?: string;
  channels: string[]; // ['whatsapp', 'instagram', 'telegram']
  botPlatform: string; // 'evolution', 'n8n', 'meta_business'
}

export interface OnboardingResult {
  organizationId: number;
  apiKey: string;
  hmacSecret: string;
  setupInstructions: string;
  webhookUrls: {
    leadUpsert: string;
    leadAttribute: string;
    leadService: string;
    message: string;
  };
  testCommands: string[];
  checklist: string[];
  adminInvite?: {
    email: string;
    role: 'admin';
    inviteUrl: string;
    expiresAt: string;
  };
}

@Injectable()
export class ClientOnboardingService {
  constructor(
    private readonly apiKeyService: ApiKeyManagementService,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(VerificationToken)
    private readonly tokenRepo: Repository<VerificationToken>,
  ) {}

  /**
   * Onboarding completo de novo cliente
   */
  async onboardNewClient(clientData: ClientOnboardingData): Promise<OnboardingResult> {
    // 1. Criar Organization real (respeita FKs)
    const org = await this.orgRepo.save({
      name: clientData.clientName,
    });
    const organizationId = org.id;

    // 2. Gerar API Key para o cliente
    const apiKeyData = await this.apiKeyService.generateApiKey(
      organizationId,
      `${clientData.clientName} - ${clientData.botPlatform.toUpperCase()}`
    );

    // 3. Gerar instruções de setup
    const setupInstructions = this.generateSetupInstructions(
      clientData,
      organizationId,
      apiKeyData.apiKey
    );

    // 4. URLs dos webhooks
    const baseUrl = process.env.API_BASE_URL || 'https://api.seudominio.com';
    const webhookUrls = {
      leadUpsert: `${baseUrl}/ingest/lead-upsert`,
      leadAttribute: `${baseUrl}/ingest/lead-attribute`,
      leadService: `${baseUrl}/ingest/lead-service`,
      message: `${baseUrl}/ingest/message`,
    };

    // 5. Comandos de teste
    const testCommands = this.generateTestCommands(
      baseUrl,
      apiKeyData.apiKey,
      clientData
    );

    // 5b. Checklist resumido para o cliente
    const checklist: string[] = [
      'Configurar API Key no bot (x-api-key)',
      `Definir webhook para ${baseUrl}/ingest/lead-upsert`,
      'Testar criação de lead (lead-upsert)',
      'Vincular serviço desejado ao lead (lead-service)',
      'Enviar mensagem de teste (message)',
      'Verificar lead e serviço no dashboard/BFF',
    ];

    // 6. (Opcional) Gerar convite de Owner/Admin para o responsável
    let adminInvite: OnboardingResult['adminInvite'] | undefined = undefined;
    if (clientData.email) {
      const invite = await this.createAdminInvite(organizationId, clientData.email);
      adminInvite = {
        email: clientData.email,
        role: 'admin',
        inviteUrl: invite.inviteUrl,
        expiresAt: invite.expiresAt.toISOString(),
      };
    }

    return {
      organizationId,
      apiKey: apiKeyData.apiKey,
      hmacSecret: apiKeyData.hmac_secret,
      setupInstructions,
      webhookUrls,
      testCommands,
      checklist,
      adminInvite,
    };
  }

  /**
   * Gerar checklist de configuração para o cliente
   */
  generateClientChecklist(organizationId: number, apiKey: string): string {
    return `
# 📋 Checklist de Configuração - Cliente ID ${organizationId}

## ✅ Passos Obrigatórios:

### 1. Configurar Bot/Webhook
- [ ] Adicionar API Key: \`${apiKey}\`
- [ ] Configurar endpoint: \`https://api.seudominio.com/ingest/lead-upsert\`
- [ ] Testar webhook com lead fictício

### 2. Mapping de Campos
- [ ] Phone: Campo obrigatório (formato: +5511999999999)
- [ ] Name: Nome do lead
- [ ] Source: Origem (whatsapp, instagram, etc.)
- [ ] App: Plataforma do bot (evolution, n8n, etc.)

### 3. Testes Básicos
- [ ] Criar lead via webhook
- [ ] Verificar lead no dashboard
- [ ] Testar fluxo de mensagens
- [ ] Validar atributos dinâmicos

### 4. Monitoramento
- [ ] Configurar alertas de erro
- [ ] Dashboard de métricas ativo
- [ ] Rate limiting configurado
- [ ] Logs de auditoria funcionando

## 🔧 Configurações Avançadas (Opcional):

### HMAC Anti-Replay (Recomendado para Produção)
\`\`\`env
HMAC_ENABLED=true
HMAC_SECRET=${apiKey.replace('bridge_', 'bridge_hmac_')}
\`\`\`

### Rate Limiting
- Limite atual: 100 requests/minuto
- Ajustar se necessário para volume do cliente

### Channels Suportados
- WhatsApp (evolution, meta_business)
- Instagram (meta_business)
- Telegram (custom)
- SMS (custom)
`;
  }

  /**
   * Instruções específicas por plataforma
   */
  private generateSetupInstructions(
    clientData: ClientOnboardingData,
    organizationId: number,
    apiKey: string
  ): string {
    const baseUrl = process.env.API_BASE_URL || 'https://api.seudominio.com';

    switch (clientData.botPlatform.toLowerCase()) {
      case 'evolution':
        return this.generateEvolutionInstructions(baseUrl, apiKey, organizationId);
      
      case 'n8n':
        return this.generateN8nInstructions(baseUrl, apiKey, organizationId);
      
      case 'meta_business':
        return this.generateMetaBusinessInstructions(baseUrl, apiKey, organizationId);
      
      default:
        return this.generateGenericInstructions(baseUrl, apiKey, organizationId);
    }
  }

  private generateEvolutionInstructions(baseUrl: string, apiKey: string, orgId: number): string {
    return `
# 🤖 Configuração Evolution API - Org ${orgId}

## 1. Webhook Configuration
\`\`\`json
{
  "webhook": {
    "url": "${baseUrl}/ingest/lead-upsert",
    "events": ["MESSAGES_UPSERT"],
    "headers": {
      "x-api-key": "${apiKey}",
      "Content-Type": "application/json"
    }
  }
}
\`\`\`

## 2. Payload Mapping
\`\`\`javascript
function mapEvolutionToLead(evolutionPayload) {
  return {
    phone: evolutionPayload.key.remoteJid.replace('@s.whatsapp.net', ''),
    name: evolutionPayload.pushName || 'Unknown',
    source: 'whatsapp',
    app: 'evolution',
    conversation_id: evolutionPayload.key.remoteJid,
    channel: 'whatsapp'
  };
}
\`\`\`

## 3. Message Handling
\`\`\`javascript
function handleMessage(evolutionPayload) {
  const messageData = {
    phone: evolutionPayload.key.remoteJid.replace('@s.whatsapp.net', ''),
    direction: evolutionPayload.key.fromMe ? 'out' : 'in',
    type: evolutionPayload.messageType,
    payload: evolutionPayload.message,
    channel: 'whatsapp',
    app: 'evolution',
    conversation_id: evolutionPayload.key.remoteJid
  };
  
  fetch('${baseUrl}/ingest/message', {
    method: 'POST',
    headers: {
      'x-api-key': '${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messageData)
  });
}
\`\`\`
`;
  }

  private generateN8nInstructions(baseUrl: string, apiKey: string, orgId: number): string {
    return `
# 🔗 Configuração n8n - Org ${orgId}

## 1. HTTP Request Node
- **Method**: POST
- **URL**: ${baseUrl}/ingest/lead-upsert
- **Headers**:
  - x-api-key: ${apiKey}
  - Content-Type: application/json

## 2. Body Template
\`\`\`json
{
  "phone": "{{ $json.phone }}",
  "name": "{{ $json.name }}",
  "email": "{{ $json.email }}",
  "source": "{{ $json.source || 'n8n' }}",
  "app": "n8n",
  "conversation_id": "{{ $json.conversation_id }}",
  "channel": "{{ $json.channel }}"
}
\`\`\`

## 3. Error Handling
Adicione node "If" para verificar status code:
- 200-299: Sucesso
- 401: API Key inválida
- 429: Rate limit excedido
- 500: Erro interno
`;
  }

  private generateMetaBusinessInstructions(baseUrl: string, apiKey: string, orgId: number): string {
    return `
# 📱 Configuração Meta Business - Org ${orgId}

## 1. Webhook Endpoint
**URL**: ${baseUrl}/ingest/lead-upsert
**Method**: POST
**Headers**: x-api-key: ${apiKey}

## 2. Lead Ads Integration
\`\`\`javascript
function handleLeadAd(leadData) {
  const payload = {
    phone: leadData.phone_number,
    name: leadData.full_name,
    email: leadData.email,
    source: 'instagram',
    app: 'meta_business',
    conversation_id: leadData.leadgen_id,
    channel: 'instagram'
  };
  
  // Enviar para Bridge API
  fetch('${baseUrl}/ingest/lead-upsert', {
    method: 'POST',
    headers: {
      'x-api-key': '${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
\`\`\`

## 3. Instagram Messages
\`\`\`javascript
function handleInstagramMessage(messageData) {
  fetch('${baseUrl}/ingest/message', {
    method: 'POST',
    headers: {
      'x-api-key': '${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: messageData.sender.id,
      direction: 'in',
      type: 'text',
      payload: { text: messageData.message.text },
      channel: 'instagram',
      app: 'meta_business',
      conversation_id: messageData.conversation_id
    })
  });
}
\`\`\`
`;
  }

  private generateGenericInstructions(baseUrl: string, apiKey: string, orgId: number): string {
    return `
# 🔧 Configuração Genérica - Org ${orgId}

## Endpoints Disponíveis:
1. **Lead Upsert**: ${baseUrl}/ingest/lead-upsert
2. **Lead Attribute**: ${baseUrl}/ingest/lead-attribute  
3. **Message**: ${baseUrl}/ingest/message

## Headers Obrigatórios:
- x-api-key: ${apiKey}
- Content-Type: application/json

## Exemplo de Integração:
\`\`\`javascript
const bridgeAPI = {
  baseUrl: '${baseUrl}',
  apiKey: '${apiKey}',
  
  createLead: async (leadData) => {
    const response = await fetch(\`\${bridgeAPI.baseUrl}/ingest/lead-upsert\`, {
      method: 'POST',
      headers: {
        'x-api-key': bridgeAPI.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leadData)
    });
    return response.json();
  }
};
\`\`\`
`;
  }

  private generateTestCommands(baseUrl: string, apiKey: string, clientData: ClientOnboardingData): string[] {
    return [
      `curl -X POST ${baseUrl}/ingest/lead-upsert \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+5511999999999","name":"Lead Teste ${clientData.clientName}","source":"${clientData.channels[0] || 'whatsapp'}"}'`,
      
      `curl -X POST ${baseUrl}/ingest/lead-attribute \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+5511999999999","key":"servico","value":"${clientData.businessType}","source":"teste"}'`,
      
      `curl -X POST ${baseUrl}/ingest/lead-service \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+5511999999999","service_slug":"corte-feminino","relation":"desired"}'`,
      
      `curl -X POST ${baseUrl}/ingest/message \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+5511999999999","direction":"in","type":"text","payload":{"text":"Mensagem de teste"},"channel":"${clientData.channels[0] || 'whatsapp'}","app":"${clientData.botPlatform}"}'`
    ];
  }

  /**
   * Busca próximo organization_id disponível
   */
  private async getNextOrganizationId(): Promise<number> {
    // Por simplicidade, vamos usar timestamp como ID
    // Em produção, você pode ter uma tabela organizations
    return Date.now() % 1000000; // ID baseado em timestamp
  }

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  private async createAdminInvite(organizationId: number, email: string) {
    const { raw, hash } = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    await this.tokenRepo.save({
      user_id: null,
      token_hash: hash,
      type: 'invite',
      organization_id: organizationId,
      invite_email: email,
      invite_role: 'admin',
      invited_by_user_id: null,
      expires_at: expiresAt,
      used_at: null,
    });
    const baseUrl = process.env.FRONT_BASE_URL || process.env.API_BASE_URL || 'https://app.seudominio.com';
    const inviteUrl = `${baseUrl}/accept-invite?token=${raw}`;
    return { inviteUrl, expiresAt };
  }
}