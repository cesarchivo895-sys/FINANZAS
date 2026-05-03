const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/me', (req, res) => {
  res.json(req.user);
});

router.put('/me', async (req, res) => {
  const { name, avatar, currency } = req.body;

  try {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ name: name || req.user.name, avatar: avatar || req.user.avatar, currency: currency || req.user.currency })
      .eq('id', req.user.id);

    if (dbError) return res.status(500).json({ error: dbError.message });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
