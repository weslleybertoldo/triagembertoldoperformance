import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWeekend, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateSlots, fetchOccupiedSlots, isSlotBlocked } from "@/lib/calendar-utils";

interface Props {
  alunoId: string;
  onBooked: () => void;
  consultas: { data_consulta: string; status?: string }[];
}

const AlunoScheduler = ({ alunoId, onBooked, consultas }: Props) => {
  const { toast } = useToast();
  const today = startOfDay(new Date());

  const getInitialOffset = () => {
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    const we = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we }).filter(
      (d) => !isWeekend(d) && !isBefore(d, today) && !isSameDay(d, today)
    );
    return days.length === 0 ? 1 : 0;
  };

  const [weekOffset, setWeekOffset] = useState(getInitialOffset);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);

  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d) && !isBefore(d, today) && !isSameDay(d, today)
  );

  // Check if student already has active appointment this week
  const hasAppointmentThisWeek = consultas.some((c) => {
    if (c.status === "cancelada") return false;
    const d = new Date(c.data_consulta);
    return d >= weekStart && d <= weekEnd;
  });

  useEffect(() => {
    if (!selectedDay) return;
    fetchOccupiedSlots(selectedDay).then(setBookedSlots);
  }, [selectedDay]);

  const slots = selectedDay ? generateSlots(selectedDay) : [];

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      const { error } = await supabase.from("tb_consultas").insert({
        aluno_id: alunoId,
        data_consulta: selectedSlot.toISOString(),
        criado_por: "aluno",
      });
      if (error) throw error;
      toast({ title: "Consulta agendada!", description: format(selectedSlot, "dd/MM 'às' HH:mm") });
      setSelectedSlot(null);
      setSelectedDay(null);
      onBooked();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  return (
    <div>
      {hasAppointmentThisWeek && (
        <p className="text-sm text-warning mb-4">
          ⚠️ Você já possui um agendamento nesta semana.
        </p>
      )}

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} className="p-2 rounded-full hover:bg-secondary disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium">{format(weekStart, "dd MMM", { locale: ptBR })} — {format(weekEnd, "dd MMM", { locale: ptBR })}</span>
        <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-full hover:bg-secondary">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
            className={`flex flex-col items-center min-w-[56px] rounded-xl py-3 px-2 transition-all ${
              selectedDay && isSameDay(day, selectedDay) ? "gradient-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <span className="text-xs font-medium uppercase">{format(day, "EEE", { locale: ptBR })}</span>
            <span className="text-lg font-heading font-bold">{format(day, "dd")}</span>
          </button>
        ))}
      </div>

      {selectedDay && (
        <>
          <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto mb-4">
            {slots.filter((s) => s.getTime() > Date.now()).map((slot) => {
              const blocked = isSlotBlocked(slot, bookedSlots);
              return (
                <button
                  key={slot.toISOString()}
                  onClick={() => !blocked && setSelectedSlot(slot)}
                  disabled={blocked}
                  className={`rounded-lg py-3 text-sm font-medium transition-all ${
                    blocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
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

          {selectedSlot && (
            <Button
              onClick={handleBook}
              disabled={booking || hasAppointmentThisWeek}
              className="w-full py-5 font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
            >
              {booking ? "Agendando..." : "Confirmar agendamento"}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default AlunoScheduler;
