import { USERS, verifySignedToken, normalizeLoginText } from '../server/shared';

export default async function handler(req: any, res: any) {
  // Accept only GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: `Método ${req.method} não permitido` });
  }

  try {
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

    return res.status(200).json({
      success: true,
      user: {
        role: user.role,
        unitName: user.unitName
      }
    });
  } catch (error) {
    console.error('[API Me] Erro interno:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' 
    });
  }
}
