import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AlunoScheduler from "@/components/aluno/AlunoScheduler";
import InstallAppButton from "@/components/pwa/InstallAppButton";

interface Aluno {
  id: string;
  nome: string;
  foto_url: string | null;
  acesso_liberado: boolean;
}

interface Consulta {
  id: string;
  data_consulta: string;
  status: string;
  observacao: string | null;
}

const AlunoArea = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/aluno/login"); return; }

      const { data: profile } = await supabase
        .from("tb_alunos")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        // Auto-create profile for OAuth users
        const { data: created } = await supabase.from("tb_alunos").insert({
          id: session.user.id,
          nome: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          foto_url: session.user.user_metadata?.avatar_url,
        }).select().single();
        setAluno(created);
      } else {
        setAluno(profile);
      }

      const { data: cons } = await supabase
        .from("tb_consultas")
        .select("*")
        .eq("aluno_id", session.user.id)
        .order("data_consulta", { ascending: false });
      setConsultas(cons || []);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/aluno/login");
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const refreshConsultas = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("tb_consultas")
      .select("*")
      .eq("aluno_id", session.user.id)
      .order("data_consulta", { ascending: false });
    setConsultas(data || []);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (aluno && !aluno.acesso_liberado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
        <div className="text-center max-w-sm">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">
            Acesso não liberado
          </h2>
          <p className="text-muted-foreground mb-6">
            Seu acesso ainda não foi liberado. Aguarde a confirmação do administrador.
          </p>
          <Button onClick={handleLogout} variant="outline" className="rounded-xl">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    aguardando: "bg-warning/10 text-warning",
    confirmada: "bg-success/10 text-success",
    cancelada: "bg-destructive/10 text-destructive",
  };

  const statusEmoji: Record<string, string> = {
    aguardando: "🟡",
    confirmada: "🟢",
    cancelada: "🔴",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {aluno?.foto_url && (
            <img src={aluno.foto_url} className="h-10 w-10 rounded-full object-cover" alt="" />
          )}
          <span className="font-heading font-semibold text-foreground">
            {aluno?.nome}
          </span>
        </div>
        <button onClick={handleLogout} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8">
        {/* Schedule Section */}
        <section>
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">
            Agendar Consulta
          </h3>
          <AlunoScheduler alunoId={aluno!.id} onBooked={refreshConsultas} consultas={consultas} />
        </section>

        {/* My Appointments */}
        <section>
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">
            Minhas Consultas
          </h3>
          {consultas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma consulta agendada.</p>
          ) : (
            <div className="space-y-3">
              {consultas.map((c) => (
                <div key={c.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">
                      {format(new Date(c.data_consulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[c.status] || ""}`}>
                      {statusEmoji[c.status] || ""} {c.status}
                    </span>
                  </div>
                  {c.observacao && (
                    <p className="text-sm text-muted-foreground mt-2">{c.observacao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="px-4 py-3 space-y-3">
        <InstallAppButton />
        <p className="text-center text-sm text-muted-foreground">By Weslley Bertoldo</p>
      </footer>
    </div>
  );
};

export default AlunoArea;
