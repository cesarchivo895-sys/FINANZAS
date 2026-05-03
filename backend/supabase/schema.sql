-- Finanzas Familia - Supabase Schema
-- Ejecutar en el SQL Editor de Supabase

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de perfiles de usuario (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger auto-update updated_at (utilidad general)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, currency)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'), NEW.email, COALESCE(NEW.raw_user_meta_data->>'currency', 'USD'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Familias
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Miembros de familia
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Invitaciones
CREATE TABLE IF NOT EXISTS family_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gastos e ingresos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  type TEXT CHECK(type IN ('expense', 'income')) DEFAULT 'expense',
  recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK(recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Presupuestos
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL(12, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  period TEXT CHECK(period IN ('daily', 'monthly', 'yearly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metas de Ahorro
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6C63FF',
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  deadline DATE,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contribuciones a metas de ahorro
CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transferencias entre metas de ahorro
CREATE TABLE IF NOT EXISTS savings_transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  to_goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (from_goal_id != to_goal_id)
);

-- Monedas
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rate_to_usd DECIMAL(12, 6) NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuración de usuario (preferencias adicionales)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_currency TEXT DEFAULT 'USD',
  fiscal_year_start INT DEFAULT 1,
  dark_mode BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  budget_alert_thresholds INT[] DEFAULT ARRAY[75, 90, 100],
  savings_alert_thresholds INT[] DEFAULT ARRAY[25, 50, 75, 100],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_family_date ON expenses(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Ver propio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Actualizar propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Ver familias propias" ON families FOR SELECT USING (
  id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
);
CREATE POLICY "Crear familia" ON families FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Ver miembros de tu familia" ON family_members FOR SELECT USING (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
);
CREATE POLICY "Gestionar miembros (admin)" ON family_members FOR ALL USING (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Ver invitaciones (admin)" ON family_invitations FOR SELECT USING (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Crear invitaciones (admin)" ON family_invitations FOR INSERT WITH CHECK (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Ver categorías propias" ON categories FOR SELECT USING (
  user_id = auth.uid() OR is_default = TRUE
);
CREATE POLICY "Crear categorías" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar categorías propias" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Eliminar categorías propias" ON categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Ver gastos propios" ON expenses FOR SELECT USING (
  user_id = auth.uid() OR
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
);
CREATE POLICY "Crear gastos" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar gastos propios" ON expenses FOR UPDATE USING (
  user_id = auth.uid() OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()) AND
   family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin'))
);
CREATE POLICY "Eliminar gastos propios" ON expenses FOR DELETE USING (
  user_id = auth.uid() OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()) AND
   family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Ver presupuestos propios" ON budgets FOR SELECT USING (
  user_id = auth.uid() OR
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
);
CREATE POLICY "Crear presupuestos" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar presupuestos propios" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Eliminar presupuestos propios" ON budgets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Ver metas propias" ON savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Crear metas" ON savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar metas propias" ON savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Eliminar metas propias" ON savings_goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Ver contribuciones propias" ON savings_contributions FOR SELECT USING (
  goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);
CREATE POLICY "Crear contribuciones" ON savings_contributions FOR INSERT WITH CHECK (
  goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);
CREATE POLICY "Actualizar contribuciones propias" ON savings_contributions FOR UPDATE USING (
  goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);
CREATE POLICY "Eliminar contribuciones propias" ON savings_contributions FOR DELETE USING (
  goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);

CREATE POLICY "Ver transferencias propias" ON savings_transfers FOR SELECT USING (
  from_goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()) OR
  to_goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);
CREATE POLICY "Crear transferencias" ON savings_transfers FOR INSERT WITH CHECK (
  from_goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()) AND
  to_goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid())
);

-- Monedas (lectura pública)
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver monedas" ON currencies FOR SELECT USING (TRUE);

-- Configuración de usuario
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver settings propios" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Crear settings propios" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar settings propios" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Trigger auto-update updated_at para user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Categorías por defecto
CREATE OR REPLACE FUNCTION decrement_savings_goal(goal_id UUID, amount_to_subtract DECIMAL)
RETURNS void AS $$
DECLARE
  goal_owner UUID;
BEGIN
  SELECT user_id INTO goal_owner FROM savings_goals WHERE id = goal_id;
  IF goal_owner != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE savings_goals
  SET current_amount = GREATEST(current_amount - amount_to_subtract, 0),
      updated_at = NOW()
  WHERE id = goal_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Función para crear familia
CREATE OR REPLACE FUNCTION create_family(family_name TEXT)
RETURNS JSON AS $$
DECLARE
  new_family_id UUID;
  invite_code TEXT;
BEGIN
  new_family_id := uuid_generate_v4();
  invite_code := encode(gen_random_bytes(4), 'hex');
  INSERT INTO families (id, name, created_by) VALUES (new_family_id, family_name, auth.uid());
  INSERT INTO family_members (family_id, user_id, role) VALUES (new_family_id, auth.uid(), 'admin');
  INSERT INTO family_invitations (family_id, email, code, expires_at)
    VALUES (new_family_id, '', invite_code, NOW() + INTERVAL '7 days');
  RETURN json_build_object('family_id', new_family_id, 'invite_code', invite_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para unirse a familia
CREATE OR REPLACE FUNCTION join_family(invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM family_invitations WHERE code = invite_code AND expires_at > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido o expirado';
  END IF;
  INSERT INTO family_members (family_id, user_id, role)
    VALUES (inv.family_id, auth.uid(), 'member')
    ON CONFLICT (family_id, user_id) DO NOTHING;
  RETURN json_build_object('family_id', inv.family_id, 'message', 'Te uniste a la familia');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para auto-update updated_at

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Categorías por defecto
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('Alimentación', '🛒', '#FF6B6B', TRUE),
  ('Transporte', '🚗', '#4ECDC4', TRUE),
  ('Vivienda', '🏠', '#45B7D1', TRUE),
  ('Entretenimiento', '🎬', '#96CEB4', TRUE),
  ('Salud', '💊', '#FFEAA7', TRUE),
  ('Educación', '📚', '#DDA0DD', TRUE),
  ('Ropa', '👕', '#98D8C8', TRUE),
  ('Servicios', '💡', '#F7DC6F', TRUE),
  ('Ahorro', '💰', '#82E0AA', TRUE),
  ('Otros', '📦', '#AEB6BF', TRUE)
ON CONFLICT DO NOTHING;
