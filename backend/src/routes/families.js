const express = require('express');
const crypto = require('crypto');
const supabase = require('../supabase');

const router = express.Router();

router.post('/create', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre es requerido' });

  try {
    const { data: family, error } = await supabase
      .from('families')
      .insert([{ name, created_by: req.user.id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase
      .from('family_members')
      .insert([{ family_id: family.id, user_id: req.user.id, role: 'admin' }]);

    res.status(201).json(family);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my', async (req, res) => {
  const { data, error } = await supabase
    .from('family_members')
    .select(`
      families (id, name, created_by, created_at),
      role
    `)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  const families = data.map(m => ({ ...m.families, role: m.role }));
  res.json(families);
});

router.get('/:id/members', async (req, res) => {
  const { data, error } = await supabase
    .from('family_members')
    .select(`
      id,
      role,
      joined_at,
      profiles (id, name, avatar)
    `)
    .eq('family_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  const members = data.map(m => ({
    ...m.profiles,
    role: m.role,
    joined_at: m.joined_at,
  }));
  res.json(members);
});

router.post('/:id/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email es requerido' });

  const code = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('family_invitations')
      .insert([{ family_id: req.params.id, email, code, expires_at: expiresAt }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Invitación creada', code, expiresAt: expiresAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/join', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Código es requerido' });

  try {
    const { data: invite, error: inviteError } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const { error: memberError } = await supabase
      .from('family_members')
      .insert([{ family_id: invite.family_id, user_id: req.user.id, role: 'member' }]);

    if (memberError) {
      if (memberError.code === '23505') {
        return res.status(409).json({ error: 'Ya eres miembro de esta familia' });
      }
      return res.status(500).json({ error: memberError.message });
    }

    await supabase.from('family_invitations').delete().eq('id', invite.id);
    res.json({ message: 'Te has unido a la familia' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/expenses', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      categories (name, icon, color),
      profiles (name)
    `)
    .eq('family_id', req.params.id)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
