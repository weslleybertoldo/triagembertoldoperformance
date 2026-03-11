import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  isWeekend,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const generateSlots = (date: Date): Date[] => {
  const slots: Date[] = [];
  for (let h = 6; h < 20; h++) {
    for (let m = 0; m < 60; m += 45) {
      if (h === 19 && m > 15) break; // last slot must end by 20h
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      slots.push(slot);
    }
  }
  return slots;
};

const StepAgendamento = ({ data, update, onNext }: Props) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);

  const today = startOfDay(new Date());
  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }).filter(
        (d) => !isWeekend(d) && !isBefore(d, today)
      ),
    [weekOffset]
  );

  // Fetch booked slots for the selected day
  useEffect(() => {
    if (!selectedDay) return;
    const dayStart = new Date(selectedDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDay);
    dayEnd.setHours(23, 59, 59, 999);

    const fetchBooked = async () => {
      // Fetch from both triagem and consultas tables
      const { data: triagem } = await supabase
        .from("tb_agendamentos_triagem")
        .select("data_agendamento")
        .gte("data_agendamento", dayStart.toISOString())
        .lte("data_agendamento", dayEnd.toISOString())
        .neq("status", "cancelado");

      const { data: consultas } = await supabase
        .from("tb_consultas")
        .select("data_consulta")
        .gte("data_consulta", dayStart.toISOString())
        .lte("data_consulta", dayEnd.toISOString())
        .neq("status", "cancelada");

      const booked: Date[] = [];
      triagem?.forEach((r) => booked.push(new Date(r.data_agendamento)));
      consultas?.forEach((r) => booked.push(new Date(r.data_consulta)));
      setBookedSlots(booked);
    };
    fetchBooked();
  }, [selectedDay]);

  const isSlotBlocked = (slot: Date) => {
    for (const booked of bookedSlots) {
      const bookedStart = booked.getTime();
      const bookedEnd = bookedStart + 45 * 60 * 1000;
      const slotStart = slot.getTime();
      const slotEnd = slotStart + 45 * 60 * 1000;
      if (slotStart < bookedEnd && slotEnd > bookedStart) return true;
    }
    // Also block past slots
    if (slot.getTime() < Date.now()) return true;
    return false;
  };

  const slots = selectedDay ? generateSlots(selectedDay) : [];

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Agende sua triagem
      </h3>
      <p className="text-muted-foreground mb-6">
        Escolha o melhor dia e horário.
      </p>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="p-2 rounded-full hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {format(currentWeekStart, "dd MMM", { locale: ptBR })} —{" "}
          {format(currentWeekEnd, "dd MMM", { locale: ptBR })}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-full hover:bg-secondary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDay(day)}
            className={`flex flex-col items-center min-w-[56px] rounded-xl py-3 px-2 transition-all ${
              selectedDay && isSameDay(day, selectedDay)
                ? "gradient-primary text-primary-foreground shadow-card"
                : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <span className="text-xs font-medium uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </span>
            <span className="text-lg font-heading font-bold">
              {format(day, "dd")}
            </span>
          </button>
        ))}
        {weekDays.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum dia disponível nesta semana.
          </p>
        )}
      </div>

      {/* Time slots */}
      {selectedDay && (
        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
          {slots.map((slot) => {
            const blocked = isSlotBlocked(slot);
            const selected =
              data.dataAgendamento &&
              slot.getTime() === data.dataAgendamento.getTime();
            return (
              <button
                key={slot.toISOString()}
                disabled={blocked}
                onClick={() => update({ dataAgendamento: slot })}
                className={`rounded-lg py-3 text-sm font-medium transition-all ${
                  blocked
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : selected
                    ? "gradient-primary text-primary-foreground shadow-card"
                    : "bg-card border border-border hover:border-primary/30 text-foreground"
                }`}
              >
                {format(slot, "HH:mm")}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!data.dataAgendamento}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepAgendamento;
