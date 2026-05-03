const supabase = require('../supabase');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      if (error.message.includes('expired') || error.message.includes('Expired')) {
        return res.status(401).json({ error: 'Token expirado. Inicie sesión nuevamente.' });
      }
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      name: profile?.name || user.email,
      email: user.email,
      avatar: profile?.avatar,
      currency: profile?.currency || 'USD',
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

module.exports = authMiddleware;
