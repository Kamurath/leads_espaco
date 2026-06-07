# Monitor de Leads Espaçolaser

App interno para monitoramento de leads captados via formulários instantâneos do Meta Ads, com login por unidade, acesso ADM e leitura de dados em tempo real via Google Sheets diretamente no navegador.

## 🚀 Funcionalidades

- **Controle de Acesso por Unidade**: Login simples validado localmente no próprio front-end.
- **Sessão Local**: Mantém a sessão do usuário ativa em `sessionStorage` mesmo após recarregar a página.
- **Visualização Filtrada**: Gerentes de unidade acessam estritamente os leads de sua própria filial. O perfil ADM (**Trafegon**) visualiza as abas interativas de todos os canais sincronizados.
- **Leitura Direta via Google Sheets**: O app realiza consultas assíncronas aos CSVs públicos das planilhas Google diretamente no navegador, eliminando o intermédio de servidores de validação.
- **Ações Rápidas de WhatsApp**: Links dinâmicos (`https://wa.me/...`) que abrem conversas em nova aba e botão de cópia rápida rápida com feedback imediato de "Copiado".
- **Interface Premium**: Design fluido e limpo com suporte nativo a modo Dia/Noite, atualização automática opcional a cada 10 minutos (com ponteiro e contador visível) e filtros multicritério de período, tipo de cliente e tipo de interesse.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion.
- **Build System**: Vite.

## ⚙️ Configuração Local

### Requisitos

- Node.js (v18 ou superior)
- NPM

### 1. Instalar Dependências

```bash
npm install
```

### 2. Rodar em Modo de Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### 3. Gerar Build de Produção (SPA Estático)

```bash
npm run build
```

Isso gera uma pasta `dist/` contendo arquivos estáticos HTML, JS e CSS prontos para serem hospedados.

---

## 🔒 Deploy e Produção (Vercel, Netlify, GitHub Pages)

Como este app foi simplificado para rodar 100% no front-end, ele não depende de variáveis de ambiente no deploy e pode ser publicado na Vercel de forma estática e direta:

1. Suba o código para um repositório no **GitHub**.
2. No painel da **Vercel**, conecte o repositório.
3. Clique em **Deploy** (a Vercel detectará que se trata de um projeto Vite e rodará o build estático automaticamente).
4. O app estará no ar pronto para uso!

**Aviso**: Este app usa leitura direta de tabelas do Google Sheets e validação local no front-end. Não inclua senhas ou credenciais altamente confidenciais diretamente em arquivos públicos.
