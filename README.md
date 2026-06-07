# Monitor de Leads Espaçolaser

App interno para monitoramento de leads vindos de formulários instantâneos do Meta Ads, com leitura em tempo real via Google Sheets e controle de acesso seguro por unidade.

## 🚀 Funcionalidades

- **Controle de Acesso Multitenant**: Login seguro segregado por Unidade ou perfil Administrador.
- **Visualização Filtrada**: Unidades visualizam estritamente seus próprios leads. Perfil ADM (Trafegon) acessa um consolidado interativo de todas as filiais.
- **Sincronização Segura**: Conexão backend com Google Sheets usando chaveamento dinâmico de planilhas por unidade direto no servidor, mantendo credenciais, spreadsheetIds e lógica de acesso 100% blindados contra qualquer inspeção no client-side.
- **Ações Rápidas de WhatsApp**: Botões de ação direta "Abrir WhatsApp" em nova aba (`https://wa.me/...`) e funcionalidade de cópia inteligente de apenas números com feedback imediato de "Copiado".
- **Interface Premium**: Design minimalista e altamente responsivo (adaptado para tablets e PCs), com toggles instantâneos para modo Dia/Noite, cards estatísticos simplificados (Total de Leads, Novos Clientes, Já é Cliente) e filtros dinâmicos de período, cliente e interesse.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion.
- **Backend / Api**: Express, Node.js, TS-Execution (`tsx`), compilação robusta de servidor utilizando `esbuild` para CommonJS (`.cjs`).
- **Build System**: Vite.

## ⚙️ Configuração Local

### Requisitos

- Node.js (v18 ou superior)
- NPM

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example` fornecido:

```env
PORT=3000
SESSION_SECRET=sua_chave_secreta_de_sessao
APP_ENV=production
```

### 3. Rodar em Modo de Desenvolvimento

```bash
npm run dev
```

### 4. Gerar Build de Produção

```bash
npm run build
```

O comando de compilação empacota o front-end via Vite e unifica o servidor Express em um único arquivo performático de CommonJS localizado em `dist/server.cjs`.

### 5. Iniciar em Produção

```bash
npm run start
```

---

## 🔒 Segurança e Boas Práticas (Vercel, Heroku, VPS)

Este projeto foi desenvolvido com as melhores diretrizes de segurança aplicadas do início ao fim:

- **Strict API First**: Os dados sensíveis das planilhas Google e as senhas de login residem unicamente nos mapas internos do backend Express. O client-side em nenhum momento interage diretamente com as fontes de dados brutas ou chaves privadas.
- **Signed Tokens**: Sessões de autenticação usam chaves criptograficamente assinadas (`HMAC-SHA256`) baseadas na variável `SESSION_SECRET`.
- **Aviso de Deploy**: "Este app deve usar o backend integrado para proteger credenciais e IDs das planilhas. Não exponha senhas ou IDs sensíveis no código do client-side."
