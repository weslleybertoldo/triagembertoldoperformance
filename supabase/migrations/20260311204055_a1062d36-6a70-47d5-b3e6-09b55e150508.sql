CREATE OR REPLACE FUNCTION handle_new_aluno()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tb_alunos (id, nome, email, foto_url, acesso_liberado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Sem nome'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_aluno
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_aluno();