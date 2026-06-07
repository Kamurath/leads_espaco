import { USERS, normalizeLoginText, generateSignedToken } from '../server/shared';

export default async function handler(req: any, res: any) {
  // Accept only POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Método ${req.method} não permitido` });
  }

  try {
    const { unit, username, password } = req.body || {};
    const loginName = unit || username;

    if (!loginName || !password) {
      return res.status(400).json({ 
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

    return res.status(200).json({
      success: true,
      user: {
        role: user.role,
        unitName: user.unitName
      },
      token: `Bearer ${token}`
    });
  } catch (error) {
    console.error('[API Login] Erro interno:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Não foi possível conectar ao servidor. Verifique o deploy da API.' 
    });
  }
}
