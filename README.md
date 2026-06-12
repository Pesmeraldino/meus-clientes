# Meus Clientes

Sistema de gestão de clientes e vendas. Crie empresas, cadastre clientes e produtos, registre vendas e acompanhe o desempenho com gráficos e visualizações.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL 16** via SQL puro (sem ORM)
- **Docker Compose** para o banco de dados
- **Tailwind CSS** + design system inspirado no Claude Code
- **Recharts** para gráficos

## Funcionalidades

- Autenticação com JWT (login, cadastro, sessão por cookie)
- Gestão de empresas com imagem/logo
- Cadastro de clientes e produtos por empresa
- Registro de vendas (cliente + produto + quantidade + preço)
- Dashboard com gráficos: receita mensal, top clientes, top produtos
- **Visualização de clientes como bolhas flutuantes** — tamanho proporcional ao volume de compras
- Dark mode / Light mode

## Como rodar

### 1. Pré-requisitos

- Node.js 20.9+
- Docker e Docker Compose

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` se necessário (as credenciais padrão funcionam com o docker-compose).

### 3. Subir o banco de dados

```bash
docker-compose up -d
```

O PostgreSQL sobe na porta 5432 e roda o `sql/init.sql` automaticamente na primeira inicialização.

### 4. Iniciar a aplicação

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura do banco

```
users
  └─ companies (1:N)
       ├─ clients  (1:N)
       ├─ products (1:N)
       └─ sales    (N:N via client + product)
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `docker-compose up -d` | Sobe o PostgreSQL |
| `docker-compose down` | Para o PostgreSQL |
