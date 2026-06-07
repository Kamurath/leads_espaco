import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Normalization function (lowercases, removes accents, trims spaces)
function normalizeLoginText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface UserConfig {
  username: string;
  normalized: string;
  password: string;
  role: 'admin' | 'unit';
  unitName: string;
  spreadsheetId?: string;
}

const USERS: UserConfig[] = [
  {
    username: "Trafegon",
    normalized: "trafegon",
    password: "342810",
    role: "admin",
    unitName: "Trafegon"
  },
  {
    username: "Araripina",
    normalized: "araripina",
    password: "1346",
    role: "unit",
    unitName: "Espaçolaser | Araripina",
    spreadsheetId: "13Y8znS97wp1Xbc-fq5UkeyoNsw1HoaLIzwjd4ffuOVc"
  },
  {
    username: "Serra",
    normalized: "serra",
    password: "4679",
    role: "unit",
    unitName: "Espaçolaser | Serra Talhada",
    spreadsheetId: "1ioAKFIXytP4HqTnWWVlZW7AelhidRkidGLlLfMuKyts"
  },
  {
    username: "Garanhuns",
    normalized: "garanhuns",
    password: "7649",
    role: "unit",
    unitName: "Espaçolaser | Garanhuns",
    spreadsheetId: "1wYdFrCOa5HxSNq7BdzB8zqmQWijMuHBgmAo-1s04PtQ"
  },
  {
    username: "Cajazeiras",
    normalized: "cajazeiras",
    password: "2316",
    role: "unit",
    unitName: "Espaçolaser | Cajazeiras",
    spreadsheetId: "1mQXWTw07CnNi2ZOpoW8-b7E0dC1go-6KjnZyZ8k0gCU"
  },
  {
    username: "Vitória",
    normalized: "vitoria",
    password: "9864",
    role: "unit",
    unitName: "Espaçolaser | Vitória Sto Antão",
    spreadsheetId: "1SG90aLpvoNF1Ths6mauXFLdb_qquvljdEUZ7aOfrVvE"
  },
  {
    username: "Livramento",
    normalized: "livramento",
    password: "7452",
    role: "unit",
    unitName: "Espaçolaser | Livramento",
    spreadsheetId: "1ZotCiuaR_tY7Fb0KQwIZn6f44Ff-N-9n4_8_L4fllTs"
  },
  {
    username: "Muriaé",
    normalized: "muriae",
    password: "6325",
    role: "unit",
    unitName: "Espaçolaser | Muriaé",
    spreadsheetId: "1p6WxAgwA1_wuDpXj3l7anpNQkOHiJ8xSW-lbWbQaY-4"
  },
  {
    username: "Vilhena",
    normalized: "vilhena",
    password: "1247",
    role: "unit",
    unitName: "Espaçolaser | Vilhena",
    spreadsheetId: "" // Ainda sem link
  },
  {
    username: "Corumbá",
    normalized: "corumba",
    password: "6582",
    role: "unit",
    unitName: "Espaçolaser | Corumbá",
    spreadsheetId: "1o3-V6BgsFaQSevosaTYV3Nl8fcfdjDhOAHO8kfrtZnI"
  },
  {
    username: "Fortaleza",
    normalized: "fortaleza",
    password: "7183",
    role: "unit",
    unitName: "Espaçolaser | Fortaleza",
    spreadsheetId: "1mQHf-If-QRXRqk3wM4XWVHQJkZsEeD9GJeBlTteZzKE"
  },
  {
    username: "Plaza",
    normalized: "plaza",
    password: "7936",
    role: "unit",
    unitName: "Espaçolaser | Plaza Macaé",
    spreadsheetId: "16smqQ6TWa2Jqv0xYnKUFAsgE1jlksFH3OV-DCbJefJE"
  },
  {
    username: "Macaé",
    normalized: "macae",
    password: "2514",
    role: "unit",
    unitName: "Espaçolaser | Centro Macaé",
    spreadsheetId: "1IAKAmP3HQk89Nzh3C-86IyIrlldEcOtegG4ZlLirWzM"
  },
  {
    username: "Quixadá",
    normalized: "quixada",
    password: "5836",
    role: "unit",
    unitName: "Espaçolaser | Quixadá",
    spreadsheetId: "1DHuCarVu-zAvNOa5ooaRDVFVswyphjplhU_0ipgpRgk"
  }
];

// Helper functions for parsing the sheets in backend

function buildCsvUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const len = cleanText.length;
  
  let row: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  let i = 0;
  while (i < len) {
    const char = cleanText[i];
    
    if (inQuotes) {
      if (char === '"') {
        const nextChar = i + 1 < len ? cleanText[i + 1] : '';
        if (nextChar === '"') {
          // Escaped double quote "" inside a quote
          currentValue += '"';
          i += 2; // Skip both quotes
        } else {
          // Closing quote
          inQuotes = false;
          i++;
        }
      } else {
        currentValue += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Opening quote
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // End of column
        row.push(currentValue.trim());
        currentValue = '';
        i++;
      } else if (char === '\n') {
        // End of row
        row.push(currentValue.trim());
        result.push(row);
        row = [];
        currentValue = '';
        i++;
      } else {
        currentValue += char;
        i++;
      }
    }
  }
  
  // Handle final row and value
  if (row.length > 0 || currentValue !== '') {
    row.push(currentValue.trim());
    result.push(row);
  }
  
  return result;
}

function normalizeHeader(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function isTestLead(row: string[]): boolean {
  if (!row || !Array.isArray(row)) return false;
  const terms = ['test lead', 'dummy data', '<test lead', 'test:', 'dummy', 'testing', 'teste'];
  return row.some(cell => {
    if (!cell) return false;
    const lower = cell.toString().toLowerCase();
    return terms.some(t => lower.includes(t));
  });
}

function isPhone(val: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    return true;
  }
  if (trimmed.startsWith('+55')) {
    return true;
  }
  if (trimmed.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return true;
  }
  return false;
}

function formatVerbatimDate(dateStr: string): { formatted: string; timestamp: number } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { formatted: '---', timestamp: 0 };
  }
  const cleaned = dateStr.trim();
  
  // Pattern 1: ISO style (yyyy-mm-dd hh:mm...) or similar
  const isoRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T ](\d{1,2}):(\d{2})/;
  const matchIso = cleaned.match(isoRegex);
  if (matchIso) {
    const [_, yyyy, mm, dd, hh, min] = matchIso;
    const padDd = dd.padStart(2, '0');
    const padMm = mm.padStart(2, '0');
    const yy = yyyy.slice(-2);
    const padHh = hh.padStart(2, '0');
    const padMin = min.padStart(2, '0');
    const ts = Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min));
    return { formatted: `${padDd}/${padMm}/${yy} | ${padHh}:${padMin}`, timestamp: ts };
  }

  // Pattern 2: BR style (dd/mm/yyyy hh:mm...) or similar
  const brRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})[T ](\d{1,2}):(\d{2})/;
  const matchBr = cleaned.match(brRegex);
  if (matchBr) {
    const [_, dd, mm, yyyy, hh, min] = matchBr;
    const padDd = dd.padStart(2, '0');
    const padMm = mm.padStart(2, '0');
    const fullYyyy = yyyy.length === 2 ? `20${yyyy}` : yyyy;
    const yy = fullYyyy.slice(-2);
    const padHh = hh.padStart(2, '0');
    const padMin = min.padStart(2, '0');
    const ts = Date.UTC(parseInt(fullYyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min));
    return { formatted: `${padDd}/${padMm}/${yy} | ${padHh}:${padMin}`, timestamp: ts };
  }

  // Fallback to standard JS Date parsing but without changing timezone representation
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(parsed.getUTCFullYear()).slice(-2);
    const hh = String(parsed.getUTCHours()).padStart(2, '0');
    const min = String(parsed.getUTCMinutes()).padStart(2, '0');
    return { formatted: `${dd}/${mm}/${yy} | ${hh}:${min}`, timestamp: parsed.getTime() };
  }
  
  return { formatted: cleaned, timestamp: 0 };
}

function normalizeStatus(val: string) {
  const clean = (val || '').trim();
  return { label: clean || '---', color: clean === 'CREATED' ? 'green' : 'yellow' };
}

function normalizeValue(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/_/g, ' ') // replace underscores with spaces
    .replace(/[.!?:;]+/g, '') // remove period, exclamation, question mark, colon, semicolon
    .replace(/\s+/g, ' ') // replace multiple spaces with single space
    .trim();
}

function normalizeCliente(val: string) {
  const normalized = normalizeValue(val);

  // Checks for "Novo Cliente" must happen BEFORE "Já é Cliente" as requested
  if (normalized.includes('ainda nao sou cliente') || normalized.includes('nao sou cliente')) {
    return { label: 'Novo Cliente', color: 'green' };
  }
  if (normalized.includes('ja sou cliente') || normalized.includes('sou cliente')) {
    return { label: 'Já é Cliente', color: 'yellow' };
  }

  // Fallback for non-identifiable values
  if (!val) {
    return { label: 'Não informado', color: 'gray' };
  }
  const displayLabel = val
    .replace(/_/g, ' ')
    .replace(/[.!?:;]+/g, '')
    .trim();
  return { label: displayLabel || 'Não informado', color: 'gray' };
}

function normalizeInteresse(val: string): string {
  const clean = (val || '').trim().toLowerCase();
  if (clean === 'quero_agendar_3_sessões_grátis' || clean === 'quero_agendar_3_sessoes_gratis') {
    return '3 Sessões';
  }
  if (clean === 'quero_conhecer_as_ofertas_do_mês' || clean === 'quero_conhecer_as_ofertas_do_mes') {
    return 'Ver Ofertas';
  }
  if (clean === 'quero_entender_como_funciona') {
    return 'Tem dúvidas';
  }
  return val ? val.replace(/_/g, ' ') : 'Outro';
}

function processWhatsApp(val: string): { digits: string; link: string } {
  const digits = (val || '').replace(/\D/g, '');
  const link = digits ? `https://wa.me/${digits}` : '';
  return { digits, link };
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'espacolaser_super_secret_dynamic_key_2026_rf83n_fallback_74932';

function generateSignedToken(payload: { username: string; role: string }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

function verifySignedToken(token: string): { username: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(`${header}.${body}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payloadStr = Buffer.from(body, 'base64url').toString('utf-8');
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

// 1. POST /api/login
app.post('/api/login', (req, res) => {
  const { unit, username, password } = req.body;
  const loginName = unit || username;

  if (!loginName || !password) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unidade e Senha são campos obrigatórios.' 
    });
  }

  const normUser = normalizeLoginText(loginName);
  const user = USERS.find(u => u.normalized === normUser);

  if (!user || user.password !== password) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unidade ou senha incorreta.' 
    });
  }

  // Generate stateless signed token
  const token = generateSignedToken({
    username: user.username,
    role: user.role
  });

  return res.json({
    success: true,
    user: {
      role: user.role,
      unitName: user.unitName
    },
    token: `Bearer ${token}`
  });
});

// Authentication middleware
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Sessão inválida. Por favor, faça login novamente.' 
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifySignedToken(token);
  if (!payload || !payload.username) {
    return res.status(401).json({ 
      success: false, 
      message: 'Sessão expirada ou inválida.' 
    });
  }

  const normUser = normalizeLoginText(payload.username);
  const user = USERS.find(u => u.normalized === normUser);

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Sessão expirada ou inválida.' 
    });
  }

  req.user = user;
  next();
}

// 2. GET /api/me
app.get('/api/me', authenticate, (req: any, res: any) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      role: user.role,
      unitName: user.unitName
    }
  });
});

// 3. POST /api/logout
app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

// 2. GET /api/leads
app.get('/api/leads', authenticate, async (req: any, res: any) => {
  const user = req.user as UserConfig;
  const requestedUnit = req.query.unit as string; // 'todos', 'Todas', or specific unitName e.g. "Espaçolaser | Araripina"

  // Check unit allowance
  let unitsToFetch: UserConfig[] = [];
  if (user.role === 'admin') {
    if (requestedUnit && requestedUnit !== 'todos' && requestedUnit !== 'Todas') {
      unitsToFetch = USERS.filter(u => u.role === 'unit' && u.unitName === requestedUnit);
    } else {
      unitsToFetch = USERS.filter(u => u.role === 'unit');
    }
  } else {
    // For unit role, ignore requestedUnit or force it to be their own unit
    unitsToFetch = USERS.filter(u => u.role === 'unit' && u.unitName === user.unitName);
  }

  const allLeads: any[] = [];
  const statuses: any[] = [];
  const seenNewKeys = new Set<string>();

  const fetchPromises = unitsToFetch.map(async (unit) => {
    if (!unit.spreadsheetId) {
      if (user.role === 'admin') {
        statuses.push({
          unitName: unit.unitName,
          status: 'pending',
          errorMessage: 'Planilha da unidade ainda não configurada.'
        });
      } else {
        statuses.push({
          unitName: unit.unitName,
          status: 'error',
          errorMessage: 'Planilha da unidade ainda não configurada.'
        });
      }
      return;
    }

    try {
      const url = buildCsvUrl(unit.spreadsheetId);
      console.log("[Leads] Carregando:", unit.unitName);
      console.log("[Leads] URL gerada:", url);

      const csvResponse = await fetch(url);
      if (!csvResponse.ok) {
        throw new Error(`Código de resposta HTTP ${csvResponse.status}`);
      }

      const text = await csvResponse.text();
      const rows = parseCSV(text);

      console.log("[Leads] Linhas recebidas:", rows.length);

      if (rows.length < 2) {
        statuses.push({ unitName: unit.unitName, status: 'success' });
        console.log("[Leads] Quantidade de leads válidos de " + unit.unitName + ": 0");
        return;
      }

      const headers = (rows[0] || []).map(h => normalizeHeader(h));

      let indexCreated = headers.findIndex(h => h.includes('created_time') || h === 'created_time');
      if (indexCreated === -1) indexCreated = 1; // Fallback B

      let indexCliente = headers.findIndex(h => h.includes('voce_ja_e_cliente_espacolaser'));
      if (indexCliente === -1) indexCliente = 12; // Fallback M

      let indexInteresse = headers.findIndex(h => h.includes('como_posso_te_ajudar_hoje'));
      if (indexInteresse === -1) indexInteresse = 13; // Fallback N

      // Stronger function to find the name column as requested:
      let indexNome = headers.findIndex(h => {
        const val = h.toLowerCase().trim();
        return val === 'nome_completo' ||
               val === 'nome' ||
               val === 'full_name' ||
               val === 'fullname' ||
               val === 'customer_name' ||
               val === 'lead_name';
      });
      if (indexNome === -1) {
        indexNome = headers.findIndex(h => {
          const val = h.toLowerCase().trim();
          return val.includes('nome_completo') ||
                 val.includes('nome') ||
                 val.includes('full_name') ||
                 val.includes('fullname') ||
                 val.includes('customer_name') ||
                 val.includes('lead_name');
        });
      }
      if (indexNome === -1) {
        indexNome = 14; // Fallback O
      }

      const nameIndex = indexNome;

      let indexWhatsApp = headers.findIndex(h => h.includes('numero_do_whatsapp') || h === 'whatsapp' || h === 'telefone' || h === 'phone');
      if (indexWhatsApp === -1) indexWhatsApp = 15; // Fallback P

      let indexStatus = headers.findIndex(h => h === 'lead_status' || h === 'status');
      if (indexStatus === -1) indexStatus = 16; // Fallback Q

      let validLeadsCount = 0;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) {
          continue;
        }

        // 1. Skip test / dummy leads
        if (isTestLead(row)) {
          continue;
        }

        let createdRaw = (row[indexCreated] !== undefined) ? row[indexCreated].trim() : '';
        let clienteRaw = (row[indexCliente] !== undefined) ? row[indexCliente].trim() : '';
        let interesseRaw = (row[indexInteresse] !== undefined) ? row[indexInteresse].trim() : '';
        let nomeRaw = (row[indexNome] !== undefined) ? row[indexNome].trim() : '';
        let whatsappRaw = (row[indexWhatsApp] !== undefined) ? row[indexWhatsApp].trim() : '';
        let statusRaw = (row[indexStatus] !== undefined) ? row[indexStatus].trim() : '';

        // If statusRaw looks like a phone number, prevent wrong mapping
        if (isPhone(statusRaw)) {
          const digitsWhatsApp = whatsappRaw.replace(/\D/g, '');
          if (digitsWhatsApp.length < 8) {
            whatsappRaw = statusRaw;
          }
          statusRaw = '';
        }

        // Disregard blank lines to avoid loading empty elements
        if (!nomeRaw && !whatsappRaw && !createdRaw) {
          continue;
        }

        const { digits: whatsappDigits, link: whatsappLink } = processWhatsApp(whatsappRaw);
        
        // Deduplication using requested: unitName + createdTimeRaw + whatsappDigits + nome
        const leadUniqueKey = unit.unitName + createdRaw + whatsappDigits + nomeRaw;
        
        if (seenNewKeys.has(leadUniqueKey)) {
          continue;
        }
        seenNewKeys.add(leadUniqueKey);

        const { formatted: createdTimeFormatted, timestamp: createdAtForSorting } = formatVerbatimDate(createdRaw);
        const { label: clienteLabel, color: clienteColor } = normalizeCliente(clienteRaw);
        const interesseLabel = normalizeInteresse(interesseRaw);
        const { label: statusLabel, color: statusColor } = normalizeStatus(statusRaw);

        allLeads.push({
          id: leadUniqueKey,
          unitName: unit.unitName,
          createdTimeRaw: createdRaw,
          createdTimeFormatted,
          clienteRaw,
          clienteLabel,
          clienteColor,
          interesseRaw,
          interesseLabel,
          nome: nomeRaw || 'Nome não informado',
          whatsappRaw: whatsappRaw || 'Sem contato',
          whatsappDigits,
          whatsappLink,
          statusRaw: statusRaw || '',
          statusLabel: statusRaw ? statusLabel : 'Sem status',
          statusColor,
          createdAtForSorting,
        });

        validLeadsCount++;
      }

      console.log("[Leads] Quantidade de leads válidos para " + unit.unitName + ":", validLeadsCount);
      statuses.push({ unitName: unit.unitName, status: 'success' });
    } catch (err: any) {
      console.error("[Leads] Erro ao carregar:", unit.unitName, err);
      statuses.push({
        unitName: unit.unitName,
        status: 'error',
        errorMessage: `Não foi possível carregar os leads de ${unit.unitName}.`
      });
    }
  });

  await Promise.all(fetchPromises);

  // Sort chronologically from newest to oldest
  allLeads.sort((a, b) => b.createdAtForSorting - a.createdAtForSorting);

  res.json({
    leads: allLeads,
    statuses
  });
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
    console.log(`Server is running securely on port ${PORT}`);
  });
}

startServer();
