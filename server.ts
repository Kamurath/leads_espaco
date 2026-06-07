import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import loginHandler from './api/login';
import meHandler from './api/me';
import logoutHandler from './api/logout';
import leadsHandler from './api/leads';

const app = express();
const PORT = 3000;

app.use(express.json());

// Relay Express calls directly to the Vercel serverless handlers
app.post('/api/login', async (req, res) => {
  try {
    await loginHandler(req, res);
  } catch (error) {
    console.error('Express Error [login]:', error);
    res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    await meHandler(req, res);
  } catch (error) {
    console.error('Express Error [me]:', error);
    res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    await logoutHandler(req, res);
  } catch (error) {
    console.error('Express Error [logout]:', error);
    res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' });
  }
});

app.get('/api/leads', async (req, res) => {
  try {
    await leadsHandler(req, res);
  } catch (error) {
    console.error('Express Error [leads]:', error);
    res.status(500).json({ success: false, message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' });
  }
});

// Configure Vite or Static Fallback middleware based on Environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running securely on http://localhost:${PORT}`);
  });
}

startServer();
