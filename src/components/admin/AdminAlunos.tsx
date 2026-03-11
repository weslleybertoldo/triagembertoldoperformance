import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWeekend, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  acesso_liberado: boolean;
  created_at: string;
}

const sendWhatsAppMessage = (whatsapp: string | null, message: string) => {
  if (!whatsapp) return;
  const phone = whatsapp.replace(/\D/g, "");
  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

interface Props {
  onCountChange?: (count: number) => void;
}

const generateSlots = (date: Date): Date[] => {
  const slots: Date[] = [];
  for (let h = 6; h < 20; h++) {
    for (let m = 0; m < 60; m += 45) {
      if (h === 19 && m > 15) break;
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      slots.push(slot);
    }
  }
  return slots;
};

const AdminAlunos = ({ onCountChange }: Props) => {
  const { toast } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAluno, setExpandedAluno] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<any[]>([]);

  // Manual scheduling state
  const [scheduleModal, setScheduleModal] = useState<Aluno | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");
  const [booking, setBooking] = useState(false);
  const [existingConsultas, setExistingConsultas] = useState<string[]>([]);

  const fetchAlunos = async () => {
    setLoading(true);
    const { data } = await supabase.from("tb_alunos").select("*").order("created_at", { ascending: false });
    setAlunos(data || []);
    onCountChange?.((data || []).length);
    setLoading(false);
  };

  useEffect(() => { fetchAlunos(); }, []);

  const toggleAccess = async (id: string, current: boolean) => {
    await supabase.from("tb_alunos").update({ acesso_liberado: !current }).eq("id", id);
    fetchAlunos();
    toast({ title: !current ? "Acesso liberado" : "Acesso bloqueado" });
  };

  const viewConsultas = async (alunoId: string) => {
    if (expandedAluno === alunoId) { setExpandedAluno(null); return; }
    const { data } = await supabase.from("tb_consultas").select("*").eq("aluno_id", alunoId).order("data_consulta", { ascending: false });
    setConsultas(data || []);
    setExpandedAluno(alunoId);
  };

  const updateConsultaStatus = async (id: string, status: string, dataConsulta: string) => {
    await supabase.from("tb_consultas").update({ status }).eq("id", id);
    if (expandedAluno) {
      viewConsultas(expandedAluno);
      const aluno = alunos.find((a) => a.id === expandedAluno);
      if (aluno?.whatsapp) {
        const dataFormatada = format(new Date(dataConsulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const msg = status === "confirmada"
          ? `Olá ${aluno.nome || ""}! ✅ Sua consulta do dia ${dataFormatada} foi *confirmada*. Nos vemos lá! — Team Bertoldo`
          : `Olá ${aluno.nome || ""}! ❌ Sua consulta do dia ${dataFormatada} foi *cancelada*. Entre em contato para reagendar. — Team Bertoldo`;
        sendWhatsAppMessage(aluno.whatsapp, msg);
      }
    }
    toast({ title: `Consulta ${status}` });
  };

  // Manual scheduling
  const openScheduleModal = async (aluno: Aluno) => {
    setScheduleModal(aluno);
    setWeekOffset(0);
    setSelectedDay(null);
    setSelectedSlot(null);
    setObservacao("");
    // Fetch all future consultas to block occupied slots
    const { data } = await supabase
      .from("tb_consultas")
      .select("data_consulta")
      .gte("data_consulta", new Date().toISOString());
    setExistingConsultas((data || []).map((c: any) => c.data_consulta));
  };

  const isSlotOccupied = (slot: Date): boolean => {
    return existingConsultas.some((dc) => {
      const existing = new Date(dc);
      const diff = Math.abs(slot.getTime() - existing.getTime());
      return diff < 45 * 60 * 1000;
    });
  };

  const handleAdminBook = async () => {
    if (!selectedSlot || !scheduleModal) return;
    setBooking(true);
    try {
      const { error } = await supabase.from("tb_consultas").insert({
        aluno_id: scheduleModal.id,
        data_consulta: selectedSlot.toISOString(),
        status: "confirmada",
        criado_por: "admin",
        observacao: observacao || null,
      });
      if (error) throw error;
      toast({ title: "Consulta agendada!", description: `${scheduleModal.nome} — ${format(selectedSlot, "dd/MM 'às' HH:mm")}` });
      if (scheduleModal.whatsapp) {
        const dataFormatada = format(selectedSlot, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        sendWhatsAppMessage(scheduleModal.whatsapp, `Olá ${scheduleModal.nome || ""}! ✅ Uma consulta foi agendada para o dia ${dataFormatada}. Nos vemos lá! — Team Bertoldo`);
      }
      setScheduleModal(null);
      if (expandedAluno === scheduleModal.id) viewConsultas(scheduleModal.id);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d) && !isBefore(d, today)
  );
  const slots = selectedDay ? generateSlots(selectedDay) : [];

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>;

  return (
    <>
      <div className="space-y-3">
        {alunos.map((a) => (
          <div key={a.id}>
            <div className="rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-foreground">{a.nome || a.email}</p>
                  <p className="text-sm text-muted-foreground">{a.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {a.acesso_liberado ? "Liberado" : "Bloqueado"}
                  </span>
                  <Switch checked={a.acesso_liberado} onCheckedChange={() => toggleAccess(a.id, a.acesso_liberado)} />
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => viewConsultas(a.id)} className="text-sm text-primary hover:underline">
                  {expandedAluno === a.id ? "Ocultar consultas" : "Ver consultas"}
                </button>
                <button onClick={() => openScheduleModal(a)} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Agendar consulta
                </button>
              </div>
            </div>

            {expandedAluno === a.id && (
              <div className="ml-4 mt-2 space-y-2">
                {consultas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma consulta.</p>
                ) : (
                  consultas.map((c) => (
                    <div key={c.id} className="rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(c.data_consulta), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2">
                          {c.criado_por === "admin" && (
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">admin</span>
                          )}
                          <span className="text-xs">{c.status}</span>
                        </div>
                      </div>
                      {c.observacao && (
                        <p className="text-xs text-muted-foreground mt-1">{c.observacao}</p>
                      )}
                      {c.status === "aguardando" && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => updateConsultaStatus(c.id, "confirmada", c.data_consulta)} className="text-xs text-success hover:underline">
                            ✅ Confirmar
                          </button>
                          <button onClick={() => updateConsultaStatus(c.id, "cancelada", c.data_consulta)} className="text-xs text-destructive hover:underline">
                            ❌ Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
        {alunos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado.</p>}
      </div>

      {/* Manual Schedule Modal */}
      <Dialog open={!!scheduleModal} onOpenChange={(open) => !open && setScheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Agendar consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Aluno</label>
              <Input value={scheduleModal?.nome || scheduleModal?.email || ""} readOnly className="mt-1 bg-secondary/50" />
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="p-2 rounded-full hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">{format(weekStart, "dd MMM", { locale: ptBR })} — {format(weekEnd, "dd MMM", { locale: ptBR })}</span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-full hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day selection */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {weekDays.map((day) => (
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

            {/* Slot selection */}
            {selectedDay && (
              <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto">
                {slots.filter((s) => s.getTime() > Date.now()).map((slot) => {
                  const occupied = isSlotOccupied(slot);
                  return (
                    <button
                      key={slot.toISOString()}
                      onClick={() => !occupied && setSelectedSlot(slot)}
                      disabled={occupied}
                      className={`rounded-lg py-2 text-xs font-medium transition-all ${
                        occupied
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

            <div>
              <label className="text-sm text-muted-foreground">Observação (opcional)</label>
              <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: retorno mensal" className="mt-1" />
            </div>

            <Button
              onClick={handleAdminBook}
              disabled={!selectedSlot || booking}
              className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
            >
              {booking ? "Agendando..." : "Confirmar agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminAlunos;
