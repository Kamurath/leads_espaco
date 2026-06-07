import crypto from 'crypto';

// Normalization function (lowercases, removes accents, trims spaces)
export function normalizeLoginText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface UserConfig {
  username: string;
  normalized: string;
  password: string;
  role: 'admin' | 'unit';
  unitName: string;
  spreadsheetId?: string;
}

export const USERS: UserConfig[] = [
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

export function buildCsvUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
}

export function parseCSV(text: string): string[][] {
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
          currentValue += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentValue += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        row.push(currentValue.trim());
        currentValue = '';
        i++;
      } else if (char === '\n') {
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
  
  if (row.length > 0 || currentValue !== '') {
    row.push(currentValue.trim());
    result.push(row);
  }
  
  return result;
}

export function normalizeHeader(text: string): string {
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

export function isTestLead(row: string[]): boolean {
  if (!row || !Array.isArray(row)) return false;
  const terms = ['test lead', 'dummy data', '<test lead', 'test:', 'dummy', 'testing', 'teste'];
  return row.some(cell => {
    if (!cell) return false;
    const lower = cell.toString().toLowerCase();
    return terms.some(t => lower.includes(t));
  });
}

export function isPhone(val: string): boolean {
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

export function formatVerbatimDate(dateStr: string): { formatted: string; timestamp: number } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { formatted: '---', timestamp: 0 };
  }
  const cleaned = dateStr.trim();
  
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

export function normalizeStatus(val: string) {
  const clean = (val || '').trim();
  return { label: clean || '---', color: clean === 'CREATED' ? 'green' : 'yellow' };
}

export function normalizeValue(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/[.!?:;]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCliente(val: string) {
  const normalized = normalizeValue(val);

  if (normalized.includes('ainda nao sou cliente') || normalized.includes('nao sou cliente')) {
    return { label: 'Novo Cliente', color: 'green' };
  }
  if (normalized.includes('ja sou cliente') || normalized.includes('sou cliente')) {
    return { label: 'Já é Cliente', color: 'yellow' };
  }

  if (!val) {
    return { label: 'Não informado', color: 'gray' };
  }
  const displayLabel = val
    .replace(/_/g, ' ')
    .replace(/[.!?:;]+/g, '')
    .trim();
  return { label: displayLabel || 'Não informado', color: 'gray' };
}

export function normalizeInteresse(val: string): string {
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

export function processWhatsApp(val: string): { digits: string; link: string } {
  const digits = (val || '').replace(/\D/g, '');
  const link = digits ? `https://wa.me/${digits}` : '';
  return { digits, link };
}

export const SESSION_SECRET = process.env.SESSION_SECRET || 'espacolaser_super_secret_dynamic_key_2026_rf83n_fallback_74932';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[AVISO] SESSION_SECRET não foi configurada no ambiente. Usando segredo fallback interno.');
}

export function generateSignedToken(payload: { username: string; role: string }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

export function verifySignedToken(token: string): { username: string; role: string } | null {
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
