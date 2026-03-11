import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, Trash2, Search, Download, Tag, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AdminTriagemDetail from "@/components/admin/AdminTriagemDetail";
import AdminAlunos from "@/components/admin/AdminAlunos";
import AdminStats from "@/components/admin/AdminStats";
import AdminTags from "@/components/admin/AdminTags";

interface TagItem {
  id: string;
  nome: string;
  cor: string;
}

  const sendWhatsApp = (whatsapp: string | null, message: string) => {
    if (!whatsapp) return;
    const phone = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"triagens" | "alunos" | "config">("triagens");
  const [triagens, setTriagens] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTriagem, setSelectedTriagem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [triagemAguardando, setTriagemAguardando] = useState(0);
  const [consultasPendentes, setConsultasPendentes] = useState(0);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const handleLogin = async () => {
    try {
      const res = await supabase.functions.invoke("admin-auth", {
        body: { username: user, password: pass },
      });
      if (res.data?.success) {
        setAuthenticated(true);
        sessionStorage.setItem("admin_token", res.data.token);
      } else {
        toast({ title: "Erro", description: "Credenciais inválidas", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha na autenticação", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) setAuthenticated(true);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchTriagens();
      fetchTags();
      fetchCounts();
    }
  }, [authenticated]);

  const fetchTriagens = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tb_agendamentos_triagem")
      .select("*")
      .order("created_at", { ascending: false });
    setTriagens(data || []);
    setTriagemAguardando((data || []).filter((t: any) => t.status === "aguardando").length);
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("tb_tags").select("*").order("created_at", { ascending: false });
    if (data && data.length === 0) {
      await supabase.from("tb_tags").insert([
        { nome: "Contatado", cor: "#22c55e" },
        { nome: "Agendado", cor: "#3b82f6" },
        { nome: "Não respondeu", cor: "#ef4444" },
      ]);
      const { data: newData } = await supabase.from("tb_tags").select("*").order("created_at", { ascending: false });
      setTags(newData || []);
    } else {
      setTags(data || []);
    }
  };

  const fetchCounts = async () => {
    const hoje = new Date().toISOString();
    const { count } = await supabase
      .from("tb_consultas")
      .select("*", { count: "exact", head: true })
      .or(`status.eq.aguardando,and(status.eq.confirmada,data_consulta.gte.${hoje})`);
    setConsultasPendentes(count || 0);
  };

  const toggleTag = async (triagemId: string, currentTags: string[] | null, tagNome: string) => {
    const current = currentTags || [];
    const updated = current.includes(tagNome)
      ? current.filter((t) => t !== tagNome)
      : [...current, tagNome];
    await supabase.from("tb_agendamentos_triagem").update({ tags: updated }).eq("id", triagemId);
    fetchTriagens();
  };

  const deleteTriagem = async (id: string) => {
    await supabase.from("tb_agendamentos_triagem").delete().eq("id", id);
    fetchTriagens();
    toast({ title: "Excluído" });
  };

  const exportExcel = async (data?: any[]) => {
    const XLSX = await import("xlsx");
    const rows = (data || triagens).map((t) => ({
      Nome: t.nome,
      WhatsApp: t.whatsapp,
      "Data Nascimento": t.data_nascimento,
      Peso: t.peso,
      Altura: t.altura,
      Objetivo: t.objetivo,
      Saúde: t.saude,
      "Data Agendamento": t.data_agendamento ? format(new Date(t.data_agendamento), "dd/MM/yyyy HH:mm") : "",
      "Como Conheceu": t.como_conheceu,
      Status: t.status,
      Tags: (t.tags || []).join(", "),
      "Data Cadastro": t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy HH:mm") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Triagens");
    XLSX.writeFile(wb, data?.length === 1 ? `triagem-${data[0].nome}.xlsx` : "triagens.xlsx");
  };

  const exportPDF = async (triagem: any) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Team Bertoldo — Ficha de Triagem", 20, 20);
    doc.setFontSize(12);
    const lines = [
      `Nome: ${triagem.nome}`,
      `WhatsApp: ${triagem.whatsapp || ""}`,
      `Objetivo: ${triagem.objetivo || ""}`,
      `Data Agendada: ${triagem.data_agendamento ? format(new Date(triagem.data_agendamento), "dd/MM/yyyy HH:mm") : ""}`,
      `Data Nascimento: ${triagem.data_nascimento || ""}`,
      `Peso: ${triagem.peso || ""} kg`,
      `Altura: ${triagem.altura || ""} cm`,
      `Saúde: ${triagem.saude || ""}`,
      `Como Conheceu: ${triagem.como_conheceu || ""}`,
      `Status: ${triagem.status}`,
      `Tags: ${(triagem.tags || []).join(", ")}`,
    ];
    lines.forEach((line, i) => doc.text(line, 20, 40 + i * 10));
    doc.setFontSize(10);
    doc.text("By Weslley Bertoldo", 20, 280);
    doc.save(`triagem-${triagem.nome}.pdf`);
  };

  const toggleFilterTag = (tagNome: string) => {
    setFilterTags((prev) =>
      prev.includes(tagNome) ? prev.filter((t) => t !== tagNome) : [...prev, tagNome]
    );
  };

  const filtered = triagens.filter((t) => {
    const matchesSearch =
      t.nome?.toLowerCase().includes(search.toLowerCase()) ||
      t.whatsapp?.includes(search);
    const matchesTags =
      filterTags.length === 0 ||
      filterTags.every((ft) => (t.tags || []).includes(ft));
    return matchesSearch && matchesTags;
  });

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate("/")} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-heading font-semibold text-foreground">Admin</h2>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-4">
            <Input placeholder="Usuário" value={user} onChange={(e) => setUser(e.target.value)} className="py-5" />
            <Input placeholder="Senha" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="py-5" />
            <Button onClick={handleLogin} className="w-full py-5 font-heading font-semibold gradient-primary text-primary-foreground rounded-xl">
              Entrar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (selectedTriagem) {
    return <AdminTriagemDetail triagem={selectedTriagem} onBack={() => setSelectedTriagem(null)} onExportPDF={() => exportPDF(selectedTriagem)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-heading font-semibold text-foreground">Painel Admin</h2>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("admin_token"); setAuthenticated(false); }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["triagens", "alunos", "config"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex-1 py-3 text-sm font-heading font-medium transition-colors ${
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "triagens" ? "Triagens" : t === "alunos" ? "Alunos" : "⚙️"}
            {t === "triagens" && triagemAguardando > 0 && (
              <span className="absolute -top-1 right-1/4 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-success text-[10px] font-bold text-white px-1">
                {triagemAguardando}
              </span>
            )}
            {t === "alunos" && consultasPendentes > 0 && (
              <span className="absolute -top-1 right-1/4 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-success text-[10px] font-bold text-white px-1">
                {consultasPendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 py-4">
        {tab === "triagens" && (
          <div>
            {/* Search + Export */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou WhatsApp"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => exportExcel(filtered)} variant="outline" size="icon" title="Exportar Excel">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Tag Filters */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className="text-xs text-muted-foreground mr-1">Filtrar:</span>
                {tags.map((tag) => {
                  const active = filterTags.includes(tag.nome);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleFilterTag(tag.nome)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                        active
                          ? "border-transparent text-white"
                          : "border-border text-foreground hover:border-primary/30"
                      }`}
                      style={active ? { backgroundColor: tag.cor } : {}}
                    >
                      {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.cor }} />}
                      {tag.nome}
                      {active && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
                {filterTags.length > 0 && (
                  <button onClick={() => setFilterTags([])} className="text-[11px] text-primary hover:underline ml-1">
                    Limpar
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((t) => (
                  <div key={t.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-heading font-semibold text-foreground">{t.nome}</p>
                        <p className="text-sm text-muted-foreground">{t.whatsapp}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.objetivo} • {t.data_agendamento ? format(new Date(t.data_agendamento), "dd/MM HH:mm") : "Sem data"}
                        </p>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.tags.map((tagName: string) => {
                              const tagObj = tags.find((tg) => tg.nome === tagName);
                              return (
                                <Badge
                                  key={tagName}
                                  className="text-[10px] px-2 py-0.5"
                                  style={{
                                    backgroundColor: (tagObj?.cor || "#6366f1") + "20",
                                    color: tagObj?.cor || "#6366f1",
                                    borderColor: (tagObj?.cor || "#6366f1") + "40",
                                  }}
                                >
                                  {tagName}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedTriagem(t)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
                        {t.whatsapp && (
                          <button
                            onClick={() => {
                              const dataFormatada = t.data_agendamento
                                ? format(new Date(t.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : "";
                              sendWhatsApp(
                                t.whatsapp,
                                `Olá ${t.nome}! Confirmamos seu agendamento para ${dataFormatada}. Qualquer dúvida estamos à disposição! - Team Bertoldo`
                              );
                            }}
                            className="p-2 rounded-lg hover:bg-secondary text-green-500"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                              <Tag className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                            <div className="space-y-1">
                              {tags.map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={() => toggleTag(t.id, t.tags, tag.nome)}
                                  className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-secondary transition-colors ${
                                    (t.tags || []).includes(tag.nome) ? "font-semibold" : ""
                                  }`}
                                >
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.cor }} />
                                  {tag.nome}
                                  {(t.tags || []).includes(tag.nome) && <span className="ml-auto text-xs">✓</span>}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <button onClick={() => exportPDF(t)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="PDF">
                          📄
                        </button>
                        <button onClick={() => exportExcel([t])} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Excel">
                          📊
                        </button>
                        <button onClick={() => deleteTriagem(t.id)} className="p-2 rounded-lg hover:bg-secondary text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma triagem encontrada.</p>}
              </div>
            )}
          </div>
        )}

        {tab === "alunos" && <AdminAlunos onCountChange={() => fetchCounts()} />}
        {tab === "config" && (
          <div className="space-y-8">
            <AdminTags onTagsChange={fetchTags} />
            <AdminStats />
          </div>
        )}
      </main>

      <footer className="px-4 py-3 text-center">
        <span className="text-sm text-muted-foreground">By Weslley Bertoldo</span>
      </footer>
    </div>
  );
};

export default AdminPanel;
