-- Agendamentos triagem (consulta grátis)
CREATE TABLE public.tb_agendamentos_triagem (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  peso NUMERIC,
  altura NUMERIC,
  objetivo TEXT,
  whatsapp TEXT,
  saude TEXT,
  data_agendamento TIMESTAMP WITH TIME ZONE NOT NULL,
  como_conheceu TEXT,
  status TEXT DEFAULT 'aguardando',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags personalizadas
CREATE TABLE public.tb_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#1a5632',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuários alunos
CREATE TABLE public.tb_alunos (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  email TEXT,
  foto_url TEXT,
  whatsapp TEXT,
  acesso_liberado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultas de acompanhamento (alunos)
CREATE TABLE public.tb_consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID REFERENCES public.tb_alunos(id) ON DELETE CASCADE,
  data_consulta TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'aguardando',
  criado_por TEXT DEFAULT 'aluno',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.tb_agendamentos_triagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_consultas ENABLE ROW LEVEL SECURITY;

-- Triagem: public insert/read for the form
CREATE POLICY "Anyone can insert triagem" ON public.tb_agendamentos_triagem FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read triagem" ON public.tb_agendamentos_triagem FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update triagem" ON public.tb_agendamentos_triagem FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete triagem" ON public.tb_agendamentos_triagem FOR DELETE TO anon, authenticated USING (true);

-- Tags: public access
CREATE POLICY "Anyone can manage tags" ON public.tb_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Alunos: own profile + anon read for admin
CREATE POLICY "Alunos acessam proprio perfil" ON public.tb_alunos FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Alunos podem inserir proprio perfil" ON public.tb_alunos FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Alunos podem atualizar proprio perfil" ON public.tb_alunos FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Anon can read alunos" ON public.tb_alunos FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update alunos" ON public.tb_alunos FOR UPDATE TO anon USING (true);

-- Consultas: own + anon for admin
CREATE POLICY "Alunos acessam proprias consultas" ON public.tb_consultas FOR SELECT TO authenticated USING (auth.uid() = aluno_id);
CREATE POLICY "Alunos podem criar consultas" ON public.tb_consultas FOR INSERT TO authenticated WITH CHECK (auth.uid() = aluno_id);
CREATE POLICY "Anon can read consultas" ON public.tb_consultas FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update consultas" ON public.tb_consultas FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can insert consultas" ON public.tb_consultas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can delete consultas" ON public.tb_consultas FOR DELETE TO anon USING (true);