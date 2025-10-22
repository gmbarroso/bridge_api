import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyManagementService } from './api-key-management.service';

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
    message: string;
  };
  testCommands: string[];
}

@Injectable()
export class ClientOnboardingService {
  constructor(
    private readonly apiKeyService: ApiKeyManagementService,
  ) {}

  /**
   * Onboarding completo de novo cliente
   */
  async onboardNewClient(clientData: ClientOnboardingData): Promise<OnboardingResult> {
    // 1. Determinar próximo organization_id
    const organizationId = await this.getNextOrganizationId();

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
      message: `${baseUrl}/ingest/message`,
    };

    // 5. Comandos de teste
    const testCommands = this.generateTestCommands(
      baseUrl,
      apiKeyData.apiKey,
      clientData
    );

    return {
      organizationId,
      apiKey: apiKeyData.apiKey,
      hmacSecret: apiKeyData.hmac_secret,
      setupInstructions,
      webhookUrls,
      testCommands,
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
}