import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const AdminStats = () => {
  const [triagemCount, setTriagemCount] = useState(0);
  const [alunosCount, setAlunosCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { count: tc } = await supabase.from("tb_agendamentos_triagem").select("*", { count: "exact", head: true });
      setTriagemCount(tc || 0);

      const { count: ac } = await supabase.from("tb_alunos").select("*", { count: "exact", head: true }).eq("acesso_liberado", true);
      setAlunosCount(ac || 0);

      // Monthly triagens (last 6 months)
      const { data: triagens } = await supabase.from("tb_agendamentos_triagem").select("created_at");
      const months: Record<string, number> = {};
      triagens?.forEach((t) => {
        const m = t.created_at?.slice(0, 7);
        if (m) months[m] = (months[m] || 0) + 1;
      });
      const sorted = Object.entries(months).sort().slice(-6).map(([month, count]) => ({ month, count }));
      setMonthlyData(sorted);
    };
    fetch();
  }, []);

  return (
    <section>
      <h3 className="text-lg font-heading font-bold text-foreground mb-4">📊 Estatísticas</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <p className="text-3xl font-heading font-bold text-foreground">{triagemCount}</p>
          <p className="text-sm text-muted-foreground">Triagens</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <p className="text-3xl font-heading font-bold text-foreground">{alunosCount}</p>
          <p className="text-sm text-muted-foreground">Alunos ativos</p>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(152 45% 20%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default AdminStats;
