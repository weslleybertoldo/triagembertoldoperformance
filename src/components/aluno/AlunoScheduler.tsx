import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWeekend, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  alunoId: string;
  onBooked: () => void;
  consultas: { data_consulta: string }[];
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

const AlunoScheduler = ({ alunoId, onBooked, consultas }: Props) => {
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [booking, setBooking] = useState(false);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (d) => !isWeekend(d) && !isBefore(d, today)
  );

  // Check if student already has appointment this week
  const hasAppointmentThisWeek = consultas.some((c) => {
    const d = new Date(c.data_consulta);
    return d >= weekStart && d <= weekEnd;
  });

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
            {slots.filter((s) => s.getTime() > Date.now()).map((slot) => (
              <button
                key={slot.toISOString()}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-lg py-3 text-sm font-medium transition-all ${
                  selectedSlot?.getTime() === slot.getTime() ? "gradient-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/30 text-foreground"
                }`}
              >
                {format(slot, "HH:mm")}
              </button>
            ))}
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
