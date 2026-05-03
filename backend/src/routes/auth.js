const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, currency } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email y password son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, currency: currency || 'USD' },
      },
    });

    if (error) {
      if (error.message.includes('already')) {
        return res.status(409).json({ error: 'Email ya registrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || name,
        email: data.user.email,
        currency: data.user.user_metadata?.currency || currency || 'USD',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || 'Usuario',
        email: data.user.email,
        currency: data.user.user_metadata?.currency || 'USD',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/guest', async (req, res) => {
  const guestEmail = `guest_${Date.now()}@temp.local`;
  const guestPassword = Math.random().toString(36).slice(-12);
  const guestName = 'Usuario Invitado';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
      options: {
        data: { name: guestName, currency: 'USD' },
        emailRedirectTo: process.env.EMAIL_REDIRECT_URL || 'http://localhost:3000',
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        name: guestName,
        email: guestEmail,
        currency: 'USD',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
