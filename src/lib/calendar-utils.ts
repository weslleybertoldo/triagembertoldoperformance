import { supabase } from "@/integrations/supabase/client";

export const generateSlots = (date: Date): Date[] => {
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

export const fetchOccupiedSlots = async (day: Date): Promise<Date[]> => {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const [triagens, consultas] = await Promise.all([
    supabase
      .from("tb_agendamentos_triagem")
      .select("data_agendamento")
      .gte("data_agendamento", dayStart.toISOString())
      .lte("data_agendamento", dayEnd.toISOString())
      .neq("status", "cancelado"),
    supabase
      .from("tb_consultas")
      .select("data_consulta")
      .gte("data_consulta", dayStart.toISOString())
      .lte("data_consulta", dayEnd.toISOString())
      .neq("status", "cancelada"),
  ]);

  const booked: Date[] = [];
  triagens.data?.forEach((r) => booked.push(new Date(r.data_agendamento)));
  consultas.data?.forEach((r) => booked.push(new Date(r.data_consulta)));
  return booked;
};

export const isSlotBlocked = (slot: Date, bookedSlots: Date[]): boolean => {
  for (const booked of bookedSlots) {
    const bookedStart = booked.getTime();
    const bookedEnd = bookedStart + 45 * 60 * 1000;
    const slotStart = slot.getTime();
    const slotEnd = slotStart + 45 * 60 * 1000;
    if (slotStart < bookedEnd && slotEnd > bookedStart) return true;
  }
  if (slot.getTime() < Date.now()) return true;
  return false;
};

export const isAdminTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
