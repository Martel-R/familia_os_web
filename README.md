# 💻 Familia OS - Dashboard Web

Aplicação Web moderna construída em **Next.js (App Router)** e **Vanilla CSS**, desenvolvida para gestão integrada familiar desktop (orçamento, eventos, rotinas infantis, saúde e inventário).

## 🚀 Tecnologias
- **Framework:** Next.js 15+ com TypeScript
- **Estilização:** Vanilla CSS (sem frameworks pesados como Tailwind)
- **BaaS:** Supabase (`@supabase/ssr` e `@supabase/supabase-js`)
- **Schema Dedicado:** `familialm`

## ⚙️ Configuração com seu Supabase Remoto

1. Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Adicione a URL do seu servidor e a chave anônima (anon key):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://api-supabase.martel.page
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```
3. No seu Supabase remoto, execute o script SQL contido em `../familia_os_backend/schema_remoto.sql` no **SQL Editor** para criar o schema `familialm` com todas as tabelas e permissões necessárias.

## 🛠️ Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento (porta 3000)
npm run dev

# Compilar para produção
npm run build

# Iniciar servidor em modo de produção
npm start
```

## 🐳 Execução via Docker

A imagem é gerada e publicada automaticamente no Docker Hub pelo pipeline de CI/CD:

```bash
docker pull <usuario>/familia-os-web:latest
docker run -d -p 3000:3000 --name familia-os-web <usuario>/familia-os-web:latest
```
