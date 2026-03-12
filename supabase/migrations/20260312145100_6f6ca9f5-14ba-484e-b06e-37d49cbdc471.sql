
CREATE TABLE IF NOT EXISTS public.tb_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.tb_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.tb_admins (email) VALUES ('weslleybertoldo18@gmail.com') ON CONFLICT (email) DO NOTHING;
