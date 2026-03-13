import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
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
import { generateSlots, fetchOccupiedSlots, isSlotBlocked } from "@/lib/calendar-utils";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const StepAgendamento = ({ data, update, onNext }: Props) => {
  const today = startOfDay(new Date());

  // Auto-advance if current week has no future days (excluding today)
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
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);

  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }).filter(
        (d) => !isWeekend(d) && !isBefore(d, today) && !isSameDay(d, today)
      ),
    [weekOffset]
  );

  useEffect(() => {
    if (!selectedDay) return;
    fetchOccupiedSlots(selectedDay).then(setBookedSlots);
  }, [selectedDay]);

  const slots = selectedDay ? generateSlots(selectedDay) : [];

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Agende sua triagem
      </h3>
      <p className="text-muted-foreground mb-6">
        Escolha o melhor dia e horário.
      </p>

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

      {selectedDay && (
        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
          {slots.map((slot) => {
            const blocked = isSlotBlocked(slot, bookedSlots);
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
