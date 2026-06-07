# 🏆 Bolão Copa 2026 — Guia de Configuração Completo

Leva ~30 minutos na primeira vez. Depois é só compartilhar o link com os amigos.

---

## O que você vai precisar criar (tudo gratuito)

| Serviço | Plano | Link |
|---------|-------|------|
| **Vercel** | Hobby (grátis) | https://vercel.com |
| **Supabase** | Free tier | https://supabase.com |
| **API-Football** | Free (100 req/dia) | https://dashboard.api-football.com/register |
| **GitHub** | Gratuito | https://github.com |
| **cron-job.org** | Gratuito | https://cron-job.org (para cron de 30 em 30 min) |

---

## Passo 1 — Supabase (banco de dados + auth)

1. Crie sua conta em https://supabase.com
2. Clique em **New project** — dê um nome (ex: `bolao-copa-2026`) e uma senha forte
3. Aguarde o projeto criar (~1 min)
4. No menu lateral, clique em **SQL Editor**
5. Cole todo o conteúdo do arquivo `supabase-schema.sql` e clique em **Run**
6. Vá em **Settings > API** e anote as 3 chaves:
   - `Project URL` → é o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → é o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → é o `SUPABASE_SERVICE_ROLE_KEY` ⚠️ nunca exponha no frontend

---

## Passo 2 — API-Football (resultados automáticos)

1. Cadastre-se em https://dashboard.api-football.com/register
2. Plano gratuito já vem com **100 requisições por dia** — suficiente para a Copa
3. Copie sua **API Key** do painel

> O plano grátis tem cota diária de 100 req. O cron roda 2x/hora = 48 req/dia.
> Está dentro da cota tranquilamente.

---

## Passo 3 — Código no GitHub

1. Crie um repositório **privado** no GitHub (privado para proteger suas chaves)
2. Envie todo este projeto para o repositório:

```bash
cd bolao-copa-2026
git init
git add .
git commit -m "Bolão Copa 2026"
git remote add origin https://github.com/SEU_USUARIO/bolao-copa-2026.git
git push -u origin main
```

---

## Passo 4 — Deploy no Vercel

1. Acesse https://vercel.com e crie sua conta (pode entrar com GitHub)
2. Clique em **Add New > Project**
3. Selecione o repositório que você criou
4. Vercel detecta automaticamente que é Next.js — clique em **Deploy**
5. Vai falhar na primeira vez (sem as variáveis de ambiente) — isso é normal
6. Vá em **Settings > Environment Variables** e adicione **todas** as variáveis abaixo:

```
NEXT_PUBLIC_SUPABASE_URL        =  (do Passo 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY   =  (do Passo 1)
SUPABASE_SERVICE_ROLE_KEY       =  (do Passo 1)
APIFOOTBALL_KEY                 =  (do Passo 2)
CRON_SECRET                     =  (gere com: openssl rand -base64 32)
```

7. Após adicionar, vá em **Deployments** e clique em **Redeploy** no último deploy

---

## Passo 5 — Tornar-se admin

1. Acesse seu site (ex: `bolao-copa-2026.vercel.app`)
2. Crie sua conta com seu email e apelido
3. Volte ao Supabase > **SQL Editor** e execute:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'SEU@EMAIL.COM'
);
```

4. Faça logout e login novamente — a aba **Admin** aparecerá na navegação

---

## Passo 6 — Importar tabela da Copa 2026

1. Logado como admin, vá na aba **Admin**
2. Clique em **"Importar tabela Copa 2026 da API"**
3. Aguarde — todos os ~100 jogos serão criados automaticamente com datas, grupos, times e bandeiras

---

## Passo 7 — Cron automático (atualização de resultados)

O `vercel.json` já configura o cron, mas o plano Hobby do Vercel só roda **1x por dia**.
Para rodar a cada **30 minutos** de graça, use o cron-job.org:

1. Crie conta em https://cron-job.org
2. Clique em **Create cronjob**
3. URL: `https://SEU-SITE.vercel.app/api/cron/update-results`
4. Em **Headers**, adicione:
   - Name: `Authorization`
   - Value: `Bearer SEU_CRON_SECRET` (o mesmo que você colocou no Vercel)
5. Schedule: a cada **30 minutos**
6. Salve e ative

Pronto! A partir daí os resultados chegam sozinhos após cada jogo.

---

## Desenvolvimento local

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/bolao-copa-2026.git
cd bolao-copa-2026

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de variáveis locais
cp .env.example .env.local
# edite .env.local com suas chaves

# 4. Rode em modo dev
npm run dev
# acesse http://localhost:3000
```

---

## Regras do bolão (resumo técnico)

| Situação | Pontos |
|----------|--------|
| Placar exato (ex: 2×1 e foi 2×1) | **3 pontos** |
| Acertou o vencedor (ex: 2×0, foi 3×1) | **1 ponto** |
| Acertou empate (ex: 1×1, foi 2×2) | **1 ponto** |
| Errou tudo | **0 pontos** |
| Sem palpite (não jogou) | **vale 0×0** |

**Trava:** palpites ficam bloqueados **30 minutos** antes do início do jogo.

---

## Estrutura do projeto

```
bolao-copa-2026/
├── app/
│   ├── page.jsx                          ← Login / Cadastro
│   ├── jogos/page.jsx                    ← Palpites por jogo
│   ├── ranking/page.jsx                  ← Ranking geral
│   ├── admin/page.jsx                    ← Painel de admin
│   └── api/
│       ├── cron/update-results/route.js  ← Roda automático a cada 30 min
│       └── admin/import-schedule/route.js ← Importa tabela da Copa
├── lib/
│   ├── supabase.js                       ← Cliente Supabase (browser)
│   └── scoring.js                        ← Lógica de pontuação
├── supabase-schema.sql                   ← Execute no Supabase
├── vercel.json                           ← Configura o cron no Vercel
└── .env.example                          ← Modelo das variáveis de ambiente
```

---

## Dúvidas comuns

**"API retornou 0 jogos"** → A Copa começa em junho/2026. Se você configurar antes, os fixtures podem não estar disponíveis ainda. Tente novamente mais próximo do início.

**"Sem permissão" ao importar** → Verifique se rodou o SQL do Passo 5 corretamente.

**Flags faltando** → A API retorna os nomes em inglês. O mapeamento está no arquivo `import-schedule/route.js`. Adicione o país manualmente se faltar.

**Cron não está atualizando** → Verifique no cron-job.org se o header `Authorization` está correto e se o site está online.
