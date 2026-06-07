---
trigger: glob
globs: .antigravity/skills/security-guard-rails.json
---

{
  "name": "security-guard-rails",
  "version": "1.0.0",
  "description": "Valida automaticamente a arquitetura do projeto contra vulnerabilidades críticas antes de qualquer deploy ou nova feature.",
  "trigger": "on_project_init, on_pre_commit, pre_deploy",
  "rules": [
    {
      "id": "SEC-001",
      "name": "Zero API Keys no Frontend",
      "severity": "CRITICAL",
      "check": "Varrer arquivos do frontend (.env, .js, .ts, .jsx, .tsx) buscando por chaves privadas (ex: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY). Garantir que chaves sensíveis estejam apenas no diretório /server ou injetadas via variáveis de ambiente de backend.",
      "remediation": "Mova a chave para o arquivo .env do servidor e utilize Serverless Functions, API Routes ou um Proxy Server para intermediar a requisição."
    },
    {
      "id": "SEC-002",
      "name": "Supabase RLS (Row Level Security) Ativo",
      "severity": "CRITICAL",
      "check": "Verificar se as tabelas do banco de dados possuem políticas de RLS ativas. Validar se a query padrão impede que um usuário acesse registros de terceiros (usando auth.uid()).",
      "remediation": "Executar: ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY; Criar política baseada em auth.uid()."
    },
    {
      "id": "SEC-003",
      "name": "Lógica Sensível Isolada no Servidor",
      "severity": "HIGH",
      "check": "Analisar fluxos de pagamento, cálculo de preços e regras de negócio. O frontend deve apenas exibir dados, nunca definir o preço final a ser pago ou validar o status do pagamento localmente.",
      "remediation": "Centralize o cálculo e o processamento em rotas protegidas no servidor backend ou Edge Functions."
    },
    {
      "id": "SEC-004",
      "name": "Rate Limiting em APIs",
      "severity": "HIGH",
      "check": "Verificar se as rotas públicas de API possuem middleware de limitação de requisições por IP/tempo para evitar ataques de DoS ou brute-force.",
      "remediation": "Implementar rate-limit (ex: upstash/ratelimit para edge ou express-rate-limit no server)."
    },
    {
      "id": "SEC-005",
      "name": "Assinatura de Webhooks Obrigatória",
      "severity": "HIGH",
      "check": "Verificar rotas que recebem Webhooks (Stripe, gateways de pagamento, etc.). Validar se há a checagem do cabeçalho de assinatura (signature) usando a chave secreta do provedor.",
      "remediation": "Utilizar a biblioteca oficial do provedor para validar o buffer bruto (raw body) da requisição com o secret do webhook."
    }
  ]
}