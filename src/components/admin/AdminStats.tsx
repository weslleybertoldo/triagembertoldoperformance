import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminStats = () => {
  const [triagemCount, setTriagemCount] = useState(0);
  const [alunosCount, setAlunosCount] = useState(0);
  const [consultasMesCount, setConsultasMesCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [taxaConversao, setTaxaConversao] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [agendamentosMes, setAgendamentosMes] = useState<any[]>([]);
  const [mesFiltro, setMesFiltro] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [triagensRes, alunosRes, consultasRes] = await Promise.all([
          adminApi("list_triagens"),
          adminApi("list_alunos"),
          adminApi("list_all_consultas"),
        ]);
        const triagens = triagensRes.data || [];
        const alunos = alunosRes.data || [];
        const consultas = consultasRes.data || [];
        const alunosAtivos = alunos.filter((a: any) => a.acesso_liberado).length;

        setTriagemCount(triagens.length);
        setAlunosCount(alunosAtivos);
        setTaxaConversao(triagens.length > 0 ? Math.round((alunosAtivos / triagens.length) * 100) : 0);

        // Monthly triagens (last 6 months)
        const months: Record<string, number> = {};
        triagens.forEach((t: any) => {
          const m = t.created_at?.slice(0, 7);
          if (m) months[m] = (months[m] || 0) + 1;
        });
        setMonthlyData(Object.entries(months).sort().slice(-6).map(([month, count]) => ({ month, count })));

        // Consultas do mês filtrado
        const consultasMes = consultas.filter((c: any) => c.data_consulta?.slice(0, 7) === mesFiltro);
        setConsultasMesCount(consultasMes.length);

        // Status breakdown
        const sc: Record<string, number> = {};
        consultasMes.forEach((c: any) => { sc[c.status || "sem_status"] = (sc[c.status || "sem_status"] || 0) + 1; });
        setStatusCounts(sc);

        // Agendamentos do mês (triagens + consultas)
        const triagensMes = triagens
          .filter((t: any) => t.data_agendamento?.slice(0, 7) === mesFiltro)
          .map((t: any) => ({ nome: t.nome, data: t.data_agendamento, status: t.status, tipo: "Triagem" }));
        const consultasMesFormatted = consultasMes.map((c: any) => ({
          nome: alunos.find((a: any) => a.id === c.aluno_id)?.nome || "—",
          data: c.data_consulta,
          status: c.status,
          tipo: "Consulta",
        }));
        setAgendamentosMes(
          [...triagensMes, ...consultasMesFormatted].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        );
      } catch {}
    };
    fetchStats();
  }, [mesFiltro]);

  const statusColor: Record<string, string> = {
    confirmada: "text-success",
    cancelada: "text-destructive",
    aguardando: "text-warning",
    pendente: "text-warning",
  };

  // Generate month options
  const meses: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-heading font-bold text-foreground">📊 Estatísticas</h3>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <p className="text-2xl font-heading font-bold text-foreground">{triagemCount}</p>
          <p className="text-xs text-muted-foreground">Triagens</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <p className="text-2xl font-heading font-bold text-foreground">{alunosCount}</p>
          <p className="text-xs text-muted-foreground">Alunos ativos</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <p className="text-2xl font-heading font-bold text-foreground">{consultasMesCount}</p>
          <p className="text-xs text-muted-foreground">Consultas (mês)</p>
        </div>
      </div>

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Triagens por mês</p>
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
        </div>
      )}

      {/* Conversion rate */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-card">
        <p className="text-sm font-medium text-muted-foreground">Taxa de conversão</p>
        <p className="text-lg font-heading font-bold text-foreground">
          Triagens → Alunos ativos: <span className="text-primary">{taxaConversao}%</span>
        </p>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">Mês:</label>
        <select
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          {meses.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Consultas by status */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5 text-sm">
            <span className={`font-semibold ${statusColor[status] || "text-foreground"}`}>●</span>
            <span className="capitalize text-foreground">{status}:</span>
            <span className="font-bold text-foreground">{count}</span>
          </div>
        ))}
        {Object.keys(statusCounts).length === 0 && (
          <p className="text-sm text-muted-foreground">Sem consultas neste mês</p>
        )}
      </div>

      {/* Monthly appointments table */}
      {agendamentosMes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Agendamentos do mês</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-3 py-2 font-medium text-foreground">Nome</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Data</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Horário</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-foreground">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosMes.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{a.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.data ? format(new Date(a.data), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.data ? format(new Date(a.data), "HH:mm") : "—"}
                    </td>
                    <td className={`px-3 py-2 capitalize ${statusColor[a.status] || "text-foreground"}`}>
                      {a.status || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminStats;
