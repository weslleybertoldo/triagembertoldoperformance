import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWeekend, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Eye, Pencil, Trash2 } from "lucide-react";
import { generateSlots, fetchOccupiedSlots, isSlotBlocked } from "@/lib/calendar-utils";
import { adminApi } from "@/lib/admin-api";

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
  window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
};

const formatWhatsApp = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

interface Props {
  onCountChange?: (count: number) => void;
}

const AdminAlunos = ({ onCountChange }: Props) => {
  const { toast } = useToast();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAluno, setExpandedAluno] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<any[]>([]);

  // Schedule / Reschedule modal state
  const [scheduleModal, setScheduleModal] = useState<{ aluno: Aluno; consultaId?: string } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<{ id: string; aluno: Aluno; dataConsulta: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // View/Edit/Delete modals
  const [viewAluno, setViewAluno] = useState<Aluno | null>(null);
  const [editAluno, setEditAluno] = useState<Aluno | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", whatsapp: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Aluno | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewConsultasList, setViewConsultasList] = useState<any[]>([]);

  const fetchAlunos = async () => {
    setLoading(true);
    try {
      const res = await adminApi("list_alunos");
      const data = res.data || [];
      setAlunos(data);
      onCountChange?.(data.length);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAlunos(); }, []);

  const toggleAccess = async (id: string, current: boolean) => {
    await adminApi("toggle_aluno_access", { id, acesso_liberado: !current });
    fetchAlunos();
    toast({ title: !current ? "Acesso liberado" : "Acesso bloqueado" });
  };

  const viewConsultas = async (alunoId: string) => {
    if (expandedAluno === alunoId) { setExpandedAluno(null); return; }
    try {
      const res = await adminApi("list_consultas", { aluno_id: alunoId });
      setConsultas(res.data || []);
      setExpandedAluno(alunoId);
    } catch {}
  };

  const updateConsultaStatus = async (id: string, status: string, dataConsulta: string) => {
    await adminApi("update_consulta_status", { id, status });
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

  const openScheduleModal = (aluno: Aluno, consultaId?: string) => {
    setScheduleModal({ aluno, consultaId });
    setWeekOffset(0);
    setSelectedDay(null);
    setSelectedSlot(null);
    setObservacao("");
    setBookedSlots([]);
  };

  useEffect(() => {
    if (!selectedDay || !scheduleModal) return;
    fetchOccupiedSlots(selectedDay).then(setBookedSlots);
  }, [selectedDay, scheduleModal]);

  const handleAdminBook = async () => {
    if (!selectedSlot || !scheduleModal) return;
    setBooking(true);
    try {
      if (scheduleModal.consultaId) {
        await adminApi("reschedule_consulta", { id: scheduleModal.consultaId, data_consulta: selectedSlot.toISOString() });
        toast({ title: "Consulta reagendada!", description: `${scheduleModal.aluno.nome} — ${format(selectedSlot, "dd/MM 'às' HH:mm")}` });
        if (scheduleModal.aluno.whatsapp) {
          const dataFormatada = format(selectedSlot, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          sendWhatsAppMessage(scheduleModal.aluno.whatsapp, `Olá ${scheduleModal.aluno.nome || ""}! Seu agendamento foi reagendado para ${dataFormatada}. — Team Bertoldo`);
        }
      } else {
        await adminApi("create_consulta", {
          aluno_id: scheduleModal.aluno.id,
          data_consulta: selectedSlot.toISOString(),
          observacao: observacao || null,
        });
        toast({ title: "Consulta agendada!", description: `${scheduleModal.aluno.nome} — ${format(selectedSlot, "dd/MM 'às' HH:mm")}` });
        if (scheduleModal.aluno.whatsapp) {
          const dataFormatada = format(selectedSlot, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          sendWhatsAppMessage(scheduleModal.aluno.whatsapp, `Olá ${scheduleModal.aluno.nome || ""}! ✅ Uma consulta foi agendada para o dia ${dataFormatada}. Nos vemos lá! — Team Bertoldo`);
        }
      }
      setScheduleModal(null);
      if (expandedAluno) viewConsultas(expandedAluno);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const handleCancelConsulta = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await adminApi("update_consulta_status", { id: cancelTarget.id, status: "cancelada" });
      const dataFormatada = format(new Date(cancelTarget.dataConsulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      if (cancelTarget.aluno.whatsapp) {
        sendWhatsAppMessage(cancelTarget.aluno.whatsapp, `Olá ${cancelTarget.aluno.nome || ""}! Infelizmente precisamos cancelar seu agendamento de ${dataFormatada}. Entre em contato para reagendar. — Team Bertoldo`);
      }
      toast({ title: "Consulta cancelada" });
      setCancelTarget(null);
      if (expandedAluno) viewConsultas(expandedAluno);
    } catch {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  // View aluno details
  const openViewAluno = async (aluno: Aluno) => {
    setViewAluno(aluno);
    try {
      const res = await adminApi("list_consultas", { aluno_id: aluno.id });
      setViewConsultasList(res.data || []);
    } catch {
      setViewConsultasList([]);
    }
  };

  // Edit aluno
  const openEditAluno = (aluno: Aluno) => {
    setEditAluno(aluno);
    setEditForm({
      nome: aluno.nome || "",
      email: aluno.email || "",
      whatsapp: aluno.whatsapp || "",
    });
  };

  const handleEditSave = async () => {
    if (!editAluno) return;
    setEditSaving(true);
    try {
      await adminApi("update_aluno", {
        id: editAluno.id,
        nome: editForm.nome,
        email: editForm.email,
        whatsapp: editForm.whatsapp.replace(/\D/g, ""),
      });
      toast({ title: "Aluno atualizado!" });
      setEditAluno(null);
      fetchAlunos();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  // Delete aluno
  const handleDeleteAluno = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi("delete_aluno", { id: deleteTarget.id });
      toast({ title: "Aluno excluído" });
      setDeleteTarget(null);
      if (expandedAluno === deleteTarget.id) setExpandedAluno(null);
      fetchAlunos();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const today = startOfDay(new Date());
  const wStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const wEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: wStart, end: wEnd }).filter(
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

              {/* Action icons row */}
              <div className="flex gap-2 mt-3 border-t border-border pt-3">
                <button onClick={() => openViewAluno(a)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Visualizar">
                  <Eye className="h-4 w-4" />
                </button>
                <button onClick={() => openEditAluno(a)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(a)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex-1" />

                <button onClick={() => viewConsultas(a.id)} className="text-sm text-primary hover:underline">
                  {expandedAluno === a.id ? "Ocultar consultas" : "Ver consultas"}
                </button>
                <button onClick={() => openScheduleModal(a)} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Agendar
                </button>
                {a.whatsapp && (
                  <button
                    onClick={() => sendWhatsAppMessage(a.whatsapp, `Olá ${a.nome || ""}! Tudo bem? — Team Bertoldo`)}
                    className="text-sm text-success hover:underline flex items-center gap-1"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </button>
                )}
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
                          {a.whatsapp ? (
                            <button
                              onClick={() => {
                                const dataFormatada = format(new Date(c.data_consulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                sendWhatsAppMessage(a.whatsapp, `Olá ${a.nome || ""}! Seu agendamento está confirmado para ${dataFormatada}. Qualquer dúvida estamos à disposição! - Team Bertoldo`);
                              }}
                              className="p-1 rounded hover:bg-secondary text-success"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-muted-foreground opacity-40" title="WhatsApp não cadastrado">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      {c.observacao && (
                        <p className="text-xs text-muted-foreground mt-1">{c.observacao}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {c.status === "aguardando" && (
                          <>
                            <button onClick={() => updateConsultaStatus(c.id, "confirmada", c.data_consulta)} className="text-xs text-success hover:underline">
                              ✅ Confirmar
                            </button>
                            <button onClick={() => setCancelTarget({ id: c.id, aluno: a, dataConsulta: c.data_consulta })} className="text-xs text-destructive hover:underline">
                              ❌ Cancelar
                            </button>
                          </>
                        )}
                        {c.status === "confirmada" && (
                          <>
                            <button onClick={() => openScheduleModal(a, c.id)} className="text-xs text-primary hover:underline">
                              ✏️ Alterar horário
                            </button>
                            <button onClick={() => setCancelTarget({ id: c.id, aluno: a, dataConsulta: c.data_consulta })} className="text-xs text-destructive hover:underline">
                              ❌ Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
        {alunos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado.</p>}
      </div>

      {/* Schedule / Reschedule Modal */}
      <Dialog open={!!scheduleModal} onOpenChange={(open) => !open && setScheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {scheduleModal?.consultaId ? "Alterar horário" : "Agendar consulta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Aluno</label>
              <Input value={scheduleModal?.aluno.nome || scheduleModal?.aluno.email || ""} readOnly className="mt-1 bg-secondary/50" />
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="p-2 rounded-full hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">{format(wStart, "dd MMM", { locale: ptBR })} — {format(wEnd, "dd MMM", { locale: ptBR })}</span>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-full hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

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

            {selectedDay && (
              <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto">
                {slots.filter((s) => s.getTime() > Date.now()).map((slot) => {
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

            {!scheduleModal?.consultaId && (
              <div>
                <label className="text-sm text-muted-foreground">Observação (opcional)</label>
                <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: retorno mensal" className="mt-1" />
              </div>
            )}

            <Button
              onClick={handleAdminBook}
              disabled={!selectedSlot || booking}
              className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
            >
              {booking ? (scheduleModal?.consultaId ? "Reagendando..." : "Agendando...") : (scheduleModal?.consultaId ? "Confirmar reagendamento" : "Confirmar agendamento")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? O aluno será notificado via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConsulta} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? "Cancelando..." : "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Aluno Dialog */}
      <Dialog open={!!viewAluno} onOpenChange={(open) => !open && setViewAluno(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Dados do Aluno</DialogTitle>
          </DialogHeader>
          {viewAluno && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <p className="text-foreground font-medium">{viewAluno.nome || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <p className="text-foreground">{viewAluno.email || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">WhatsApp</label>
                <p className="text-foreground">{viewAluno.whatsapp ? formatWhatsApp(viewAluno.whatsapp) : "Não cadastrado"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cadastro</label>
                <p className="text-foreground">{viewAluno.created_at ? format(new Date(viewAluno.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Acesso</label>
                <p className={`font-medium ${viewAluno.acesso_liberado ? "text-success" : "text-destructive"}`}>
                  {viewAluno.acesso_liberado ? "✅ Liberado" : "🔒 Bloqueado"}
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Consultas</label>
                {viewConsultasList.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma consulta.</p>
                ) : (
                  <div className="space-y-1 mt-1">
                    {viewConsultasList.map((c) => (
                      <p key={c.id} className="text-sm text-foreground">
                        {format(new Date(c.data_consulta), "dd/MM/yyyy HH:mm", { locale: ptBR })} — <span className="text-muted-foreground">{c.status}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Aluno Dialog */}
      <Dialog open={!!editAluno} onOpenChange={(open) => !open && setEditAluno(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome</label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">WhatsApp</label>
              <Input
                value={formatWhatsApp(editForm.whatsapp)}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                placeholder="(XX) XXXXX-XXXX"
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Acesso liberado</label>
              <Switch
                checked={editAluno?.acesso_liberado || false}
                onCheckedChange={async (checked) => {
                  if (editAluno) {
                    await adminApi("toggle_aluno_access", { id: editAluno.id, acesso_liberado: checked });
                    setEditAluno({ ...editAluno, acesso_liberado: checked });
                  }
                }}
              />
            </div>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
            >
              {editSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome || deleteTarget?.email}</strong>? Esta ação não pode ser desfeita. Todas as consultas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAluno} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAlunos;
