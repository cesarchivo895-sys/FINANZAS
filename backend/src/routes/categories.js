const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${req.user.id},is_default.eq.true`)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, icon: icon || '📦', color: color || '#AEB6BF', user_id: req.user.id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { name, icon, color } = req.body;
  const { data, error } = await supabase
    .from('categories')
    .update({ name, icon, color })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Categoría eliminada' });
});

module.exports = router;
