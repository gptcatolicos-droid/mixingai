-- Dar 10 créditos a usuarios que tienen 0
UPDATE profiles SET credits = 10 WHERE credits = 0 AND plan = 'free';

-- Trigger para nuevos usuarios: dar 10 créditos automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, plan, is_pro, created_at)
  VALUES (new.id, new.email, 10, 'free', false, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
