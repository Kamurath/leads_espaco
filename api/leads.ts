import { 
  USERS, 
  UserConfig,
  verifySignedToken, 
  normalizeLoginText,
  buildCsvUrl,
  parseCSV,
  normalizeHeader,
  isTestLead,
  isPhone,
  formatVerbatimDate,
  normalizeCliente,
  normalizeInteresse,
  normalizeStatus,
  processWhatsApp
} from '../server/shared';

export default async function handler(req: any, res: any) {
  // Accept only GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Método ${req.method} não permitido` });
  }

  try {
    // 1. Authenticate session
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

    const requestedUnit = req.query.unit as string; // 'todos', 'Todas', or specific unitName

    // 2. Resolve accessible units
    let unitsToFetch: UserConfig[] = [];
    if (user.role === 'admin') {
      if (requestedUnit && requestedUnit !== 'todos' && requestedUnit !== 'Todas') {
        unitsToFetch = USERS.filter(u => u.role === 'unit' && u.unitName === requestedUnit);
      } else {
        unitsToFetch = USERS.filter(u => u.role === 'unit');
      }
    } else {
      // For unit role, strictly force retrieve their own unit
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
        console.log(`[API Leads] Carregando: ${unit.unitName}`);

        const csvResponse = await fetch(url);
        if (!csvResponse.ok) {
          throw new Error(`Código de resposta HTTP ${csvResponse.status}`);
        }

        const text = await csvResponse.text();
        const rows = parseCSV(text);

        if (rows.length < 2) {
          statuses.push({ unitName: unit.unitName, status: 'success' });
          return;
        }

        const headers = (rows[0] || []).map(h => normalizeHeader(h));

        let indexCreated = headers.findIndex(h => h.includes('created_time') || h === 'created_time');
        if (indexCreated === -1) indexCreated = 1;

        let indexCliente = headers.findIndex(h => h.includes('voce_ja_e_cliente_espacolaser'));
        if (indexCliente === -1) indexCliente = 12;

        let indexInteresse = headers.findIndex(h => h.includes('como_posso_te_ajudar_hoje'));
        if (indexInteresse === -1) indexInteresse = 13;

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
        if (indexNome === -1) indexNome = 14;

        let indexWhatsApp = headers.findIndex(h => h.includes('numero_do_whatsapp') || h === 'whatsapp' || h === 'telefone' || h === 'phone');
        if (indexWhatsApp === -1) indexWhatsApp = 15;

        let indexStatus = headers.findIndex(h => h === 'lead_status' || h === 'status');
        if (indexStatus === -1) indexStatus = 16;

        let validLeadsCount = 0;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          if (isTestLead(row)) continue;

          let createdRaw = (row[indexCreated] !== undefined) ? row[indexCreated].trim() : '';
          let clienteRaw = (row[indexCliente] !== undefined) ? row[indexCliente].trim() : '';
          let interesseRaw = (row[indexInteresse] !== undefined) ? row[indexInteresse].trim() : '';
          let nomeRaw = (row[indexNome] !== undefined) ? row[indexNome].trim() : '';
          let whatsappRaw = (row[indexWhatsApp] !== undefined) ? row[indexWhatsApp].trim() : '';
          let statusRaw = (row[indexStatus] !== undefined) ? row[indexStatus].trim() : '';

          if (isPhone(statusRaw)) {
            const digitsWhatsApp = whatsappRaw.replace(/\D/g, '');
            if (digitsWhatsApp.length < 8) {
              whatsappRaw = statusRaw;
            }
            statusRaw = '';
          }

          if (!nomeRaw && !whatsappRaw && !createdRaw) continue;

          const { digits: whatsappDigits, link: whatsappLink } = processWhatsApp(whatsappRaw);
          const leadUniqueKey = unit.unitName + createdRaw + whatsappDigits + nomeRaw;
          
          if (seenNewKeys.has(leadUniqueKey)) continue;
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

        statuses.push({ unitName: unit.unitName, status: 'success' });
      } catch (err: any) {
        console.error(`[API Leads] Falha em ${unit.unitName}:`, err);
        statuses.push({
          unitName: unit.unitName,
          status: 'error',
          errorMessage: `Não foi possível carregar os leads de ${unit.unitName.replace('Espaçolaser | ', '')}.`
        });
      }
    });

    await Promise.all(fetchPromises);

    // Sort chronologically (newest first)
    allLeads.sort((a, b) => b.createdAtForSorting - a.createdAtForSorting);

    return res.status(200).json({
      leads: allLeads,
      statuses
    });

  } catch (error) {
    console.error('[API Leads] Erro interno:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' 
    });
  }
}
