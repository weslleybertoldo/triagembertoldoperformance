import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWeekend, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import AlunoScheduler from "@/components/aluno/AlunoScheduler";
import MeusDados from "@/components/aluno/MeusDados";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateSlots, fetchOccupiedSlots, isSlotBlocked } from "@/lib/calendar-utils";

interface Aluno {
  id: string;
  nome: string;
  foto_url: string | null;
  acesso_liberado: boolean;
  whatsapp: string | null;
  email: string | null;
}

const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const LISTA_MESES = (() => {
  const meses = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    meses.push({
      valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${NOMES_MESES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return meses;
})();

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
  const [cancelTarget, setCancelTarget] = useState<Consulta | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [filtroMes, setFiltroMes] = useState("");
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<Consulta | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);
  const [rescheduling, setRescheduling] = useState(false);

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

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await supabase.from("tb_consultas").update({ status: "cancelada" }).eq("id", cancelTarget.id);
      toast({ title: "Consulta cancelada" });
      setCancelTarget(null);
      refreshConsultas();
    } catch {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const canReschedule = (c: Consulta) => {
    if (c.status !== "confirmada") return false;
    const diff = new Date(c.data_consulta).getTime() - Date.now();
    return diff > 24 * 60 * 60 * 1000; // more than 24h
  };

  const openReschedule = (c: Consulta) => {
    setRescheduleTarget(c);
    setWeekOffset(0);
    setSelectedDay(null);
    setSelectedSlot(null);
    setBookedSlots([]);
  };

  useEffect(() => {
    if (!selectedDay || !rescheduleTarget) return;
    fetchOccupiedSlots(selectedDay).then(setBookedSlots);
  }, [selectedDay, rescheduleTarget]);

  const handleReschedule = async () => {
    if (!selectedSlot || !rescheduleTarget) return;
    setRescheduling(true);
    try {
      await supabase.from("tb_consultas").update({ data_consulta: selectedSlot.toISOString() }).eq("id", rescheduleTarget.id);
      toast({ title: "Consulta reagendada!", description: format(selectedSlot, "dd/MM 'às' HH:mm") });
      setRescheduleTarget(null);
      refreshConsultas();
    } catch {
      toast({ title: "Erro ao reagendar", variant: "destructive" });
    } finally {
      setRescheduling(false);
    }
  };

  const today = startOfDay(new Date());
  const rwStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const rwEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const rwDays = eachDayOfInterval({ start: rwStart, end: rwEnd }).filter(
    (d) => !isWeekend(d) && !isBefore(d, today) && !isSameDay(d, today)
  );
  const rescheduleSlots = selectedDay ? generateSlots(selectedDay) : [];

  const consultasFiltradas = useMemo(() => {
    return consultas.filter((c) => {
      if (!filtroMes) return true;
      const d = new Date(c.data_consulta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === filtroMes;
    });
  }, [consultas, filtroMes]);

  const consultasVisiveis = mostrarTodas ? consultasFiltradas : consultasFiltradas.slice(0, 6);

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
        <MeusDados aluno={aluno!} onUpdate={() => {
          // Refresh aluno data
          supabase.from("tb_alunos").select("*").eq("id", aluno!.id).single().then(({ data }) => {
            if (data) setAluno(data);
          });
        }} />

        <section>
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">
            Agendar Consulta
          </h3>
          {!(aluno?.whatsapp && aluno.whatsapp.replace(/\D/g, "").length >= 10) ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-center">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Adicione seu WhatsApp em "Meus Dados" antes de agendar.
              </p>
            </div>
          ) : (
            <AlunoScheduler alunoId={aluno!.id} onBooked={refreshConsultas} consultas={consultas} />
          )}
        </section>

        <section>
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">
            Minhas Consultas
          </h3>
          {consultas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma consulta agendada.</p>
          ) : (
            <>
              <div className="flex gap-2 items-center flex-wrap mb-3">
                <Select value={filtroMes} onValueChange={(v) => { setFiltroMes(v === "all" ? "" : v); setMostrarTodas(false); }}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {LISTA_MESES.map((m) => (
                      <SelectItem key={m.valor} value={m.valor}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {consultasFiltradas.length > 6 && !mostrarTodas && (
                  <button onClick={() => setMostrarTodas(true)} className="text-xs text-primary hover:underline">
                    Ver todas ({consultasFiltradas.length})
                  </button>
                )}
                {mostrarTodas && (
                  <button onClick={() => setMostrarTodas(false)} className="text-xs text-primary hover:underline">
                    Mostrar menos
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {consultasVisiveis.map((c) => (
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
                    {(c.status === "aguardando" || c.status === "confirmada") && (
                      <div className="flex gap-3 mt-3">
                        {canReschedule(c) && (
                          <button
                            onClick={() => openReschedule(c)}
                            className="text-xs text-primary hover:underline"
                          >
                            ✏️ Reagendar
                          </button>
                        )}
                        <button
                          onClick={() => setCancelTarget(c)}
                          className="text-xs text-destructive hover:underline"
                        >
                          ❌ Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="px-4 py-3 space-y-3">
        <InstallAppButton />
        <p className="text-center text-sm text-muted-foreground">By Weslley Bertoldo</p>
      </footer>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? O horário ficará disponível novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? "Cancelando..." : "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Reagendar consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="p-2 rounded-full hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">{format(rwStart, "dd MMM", { locale: ptBR })} — {format(rwEnd, "dd MMM", { locale: ptBR })}</span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-full hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {rwDays.map((day) => (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                  className={`flex flex-col items-center min-w-[48px] rounded-xl py-2 px-2 transition-all text-xs ${
                    selectedDay && isSameDay(day, selectedDay) ? "gradient-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium uppercase">{format(day, "EEE", { locale: ptBR })}</span>
                  <span className="text-base font-heading font-bold">{format(day, "dd")}</span>
                </button>
              ))}
            </div>

            {selectedDay && (
              <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto">
                {rescheduleSlots.filter((s) => s.getTime() > Date.now()).map((slot) => {
                  const blocked = isSlotBlocked(slot, bookedSlots);
                  return (
                    <button
                      key={slot.toISOString()}
                      onClick={() => !blocked && setSelectedSlot(slot)}
                      disabled={blocked}
                      className={`rounded-lg py-2 text-xs font-medium transition-all ${
                        blocked
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
                          : selectedSlot?.getTime() === slot.getTime()
                          ? "gradient-primary text-primary-foreground"
                          : "bg-card border border-border hover:border-primary/30 text-foreground"
                      }`}
                    >
                      {format(slot, "HH:mm")}
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              onClick={handleReschedule}
              disabled={!selectedSlot || rescheduling}
              className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
            >
              {rescheduling ? "Reagendando..." : "Confirmar reagendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlunoArea;
