
-- Drop overly permissive anon policies on tb_agendamentos_triagem
DROP POLICY IF EXISTS "Anyone can delete triagem" ON tb_agendamentos_triagem;
DROP POLICY IF EXISTS "Anyone can update triagem" ON tb_agendamentos_triagem;

-- Drop overly permissive anon policies on tb_alunos
DROP POLICY IF EXISTS "Anon can update alunos" ON tb_alunos;

-- Drop overly permissive anon policies on tb_consultas
DROP POLICY IF EXISTS "Anon can delete consultas" ON tb_consultas;
DROP POLICY IF EXISTS "Anon can insert consultas" ON tb_consultas;
DROP POLICY IF EXISTS "Anon can update consultas" ON tb_consultas;

-- Drop overly permissive anon policy on tb_tags
DROP POLICY IF EXISTS "Anyone can manage tags" ON tb_tags;

-- Keep: "Anyone can read triagem" (anon SELECT needed for calendar slot checking)
-- Keep: "Anyone can insert triagem" (anon INSERT needed for triagem form)
-- Keep: "Anon can read alunos" (needed for some lookups)
-- Keep: "Anon can read consultas" (needed for calendar slot checking)
-- Keep: Authenticated policies for alunos/consultas (student self-access)
