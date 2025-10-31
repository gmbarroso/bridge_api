# 📬 Coleções Postman - Bridge API

Este diretório contém coleções do Postman prontas para importar e testar a Bridge API.

## 📁 Arquivos Disponíveis

### 1. `Bridge_API_Collection.json`
**Coleção principal** com os endpoints essenciais:
- ✅ Health Check
- 🔄 Lead Upsert (criar/localizar leads)
- 📝 Lead Attribute (adicionar dados K/V)
- 💬 Message (registrar mensagens)
- 📚 Swagger Documentation

### 2. `Bridge_API_Advanced_Examples.json`
**Exemplos avançados** com cenários reais:
- 📱 Fluxo completo WhatsApp
- 📸 Fluxo Instagram com formulário
- 🎯 Diferentes tipos de mensagem (texto, imagem, áudio, localização)
- 🧩 Novo modelo de Serviços (relacional): `POST /ingest/lead-service`
   - A request "3b. Vincular Serviço ao Lead (novo)" foi adicionada
   - O passo "1. Primeiro Contato" agora salva `{{lead_public_id}}` automaticamente
- ❌ Testes de validação e tratamento de erros

## 🚀 Como Importar no Postman

### Método 1: Importar via Arquivo
1. Abra o Postman
2. Clique em **Import** (botão no canto superior esquerdo)
3. Arraste os arquivos `.json` ou clique em **Upload Files**
4. Selecione os arquivos desta pasta
5. Clique em **Import**

### Método 2: Importar via Link (se hospedado)
```
Raw URL dos arquivos no GitHub ou servidor
```

## ⚙️ Configuração Inicial

### 1. Variáveis de Ambiente
Após importar, configure as variáveis:

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `base_url` | `http://localhost:3000` | URL base da API |
| `api_key` | `bridge_1_1729543200000_dev` | API Key de desenvolvimento |
| `lead_public_id` | *(auto-preenchido)* | UUID do lead criado |

### 2. Gerar Nova API Key
Para produção, gere uma nova API Key:

```bash
cd /caminho/para/bridge_api
npx ts-node src/database/seeds/generate-api-key.ts
```

### 3. Configurar Ambiente de Produção
Crie um novo Environment no Postman:
- **Nome**: `Bridge API - Production`
- **base_url**: `https://api.seudominio.com`
- **api_key**: `sua_api_key_de_producao`

## 📋 Fluxo de Teste Recomendado

### 1. Verificação Básica
```
Health Check → Deve retornar 200 OK
```

### 2. Criar Lead
```
Lead Upsert → Salva automaticamente o lead_public_id
```

### 3. Adicionar Dados
```
Lead Service (novo) → Vincula serviço ao lead (preferencial)
Lead Attribute → Enriquece o lead com informações K/V (compatibilidade)
```

### 4. Registrar Conversa
```
Message → Simula mensagens do bot/cliente
```

## 🎯 Cenários de Uso

### WhatsApp Bot (Salão de Beleza)
1. **Primeiro contato** → `Lead Upsert`
2. **Cliente pergunta sobre serviços** → `Message (in)`
3. **Bot coleta interesse** → `Lead Service (novo)` com `service_slug`
   - Alternativa legada: `Lead Attribute` com `servico_interesse` (auto-roteado)
4. **Time responde** → `Message (out)` *(marca first_response_at)*

### Instagram Lead Ads
1. **Lead do formulário** → `Lead Upsert`
2. **Dados demográficos** → `Lead Attribute` (múltiplas chamadas)
3. **Migração para WhatsApp** → Novo `conversation_id`

### Mensagens Multimídia
- **Texto**: Perguntas e respostas simples
- **Imagem**: Fotos de referência, trabalhos anteriores
- **Áudio**: Mensagens de voz transcritas
- **Localização**: Endereço do cliente

## 🔍 Debugging e Logs

### Console Logs Automáticos
As coleções incluem scripts que logam automaticamente:
- 🚀 Detalhes da requisição
- 📥 Status e tempo de resposta
- 🚦 Rate limiting info
- ❌ Mensagens de erro

### Headers de Debug
Observe os headers de resposta:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-Response-Time: 45ms
```

## 🛡️ Segurança e Rate Limiting

### Rate Limiting
- **Limite**: 100 requests/minuto por API Key
- **Header**: `X-RateLimit-*` para monitoramento
- **Erro**: 429 quando exceder limite

### HMAC (Anti-Replay)
Para habilitar proteção HMAC:
1. Configure `HMAC_ENABLED=true` no `.env`
2. Use headers adicionais:
   ```
   x-timestamp: timestamp_unix
   x-signature: hmac_sha256
   ```

### Logs de Auditoria
Todas as requisições são logadas com:
- Timestamp
- Organização
- IP de origem
- User-Agent
- Status da resposta

## 📊 Monitoramento

### Métricas Importantes
- **Lead creation rate**: Quantos leads/hora
- **Response time**: Tempo de resposta < 100ms
- **Error rate**: % de errors 4xx/5xx
- **First response time**: Tempo até primeira resposta humana

### Alertas Recomendados
- Rate limit acima de 80%
- Tempo de resposta > 200ms
- Mais de 5% de errors 401/403
- API Key inválida tentativas

## 🔧 Troubleshooting

### Problemas Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 Unauthorized | API Key ausente/inválida | Verificar header `x-api-key` |
| 400 Bad Request | Dados inválidos | Conferir JSON e tipos |
| 429 Too Many Requests | Rate limit excedido | Aguardar ou aumentar limite |
| 500 Internal Server Error | Erro no servidor | Verificar logs da aplicação |

### Validação de Dados

**Telefone**: Deve incluir código do país (+55)
**Email**: Formato válido de email
**Timestamps**: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
**UUIDs**: Formato UUID v4 válido
**service_slug**: Identificador único do serviço por organização (ex.: `corte-feminino`)

## 🧩 Serviços (novo modelo)

- Endpoint principal: `POST /ingest/lead-service`
- Headers: `x-api-key` obrigatório; `x-timestamp` e `x-signature` quando HMAC ativo
- Identificação do lead: usar `lead_public_id` (preferido) ou `lead_id`
- Identificação do serviço: usar `service_slug` (preferido), `service_public_id`, ou `service_title`
- Relação: `interested` | `desired` | `purchased` | `recommended` (default: `desired`)

Exemplo:

```json
{
   "lead_public_id": "{{lead_public_id}}",
   "service_slug": "corte-feminino",
   "relation": "interested",
   "source": "bot_whatsapp"
}
```

Compatibilidade: o endpoint `POST /ingest/lead-attribute` aceita chaves `servico_desejado`, `servico_interesse`, `service`, `service_slug` e faz o roteamento interno para o novo modelo (usando o valor como slug). Preferir o endpoint dedicado de serviços para novas integrações.

## 📞 Suporte

Para dúvidas sobre a API:
1. Consulte a documentação Swagger: `GET /api`
2. Verifique os logs de erro no console
3. Use os exemplos avançados como referência

---

**🎉 Pronto para testar!** Importe as coleções e comece a explorar a Bridge API.