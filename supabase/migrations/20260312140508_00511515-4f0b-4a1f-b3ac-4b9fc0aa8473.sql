CREATE TABLE IF NOT EXISTS public.tb_config_triagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  numero_whatsapp text NOT NULL DEFAULT '5582999381474',
  mensagem_whatsapp text NOT NULL DEFAULT 'Olá! Acabei de solicitar minha consulta grátis pelo app Team Bertoldo.

Nome: {nome}
Data: {data}
Horário: {horario}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tb_config_triagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_config_triagem"
  ON public.tb_config_triagem FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_update_config_triagem"
  ON public.tb_config_triagem FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anyone_can_insert_config_triagem"
  ON public.tb_config_triagem FOR INSERT
  WITH CHECK (true);

INSERT INTO public.tb_config_triagem (perguntas)
SELECT '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.tb_config_triagem LIMIT 1);