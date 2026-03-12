import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";

interface Pergunta {
  id: string;
  ordem: number;
  texto: string;
  tipo: "texto" | "opcoes";
  opcoes: string[];
}

interface Config {
  id: string;
  perguntas: Pergunta[];
  numero_whatsapp: string;
  mensagem_whatsapp: string;
  updated_at: string;
}

function gerarSlugPergunta(texto: string): string {
  const stopwords = [
    "qual", "e", "o", "a", "os", "as", "seu", "sua", "de", "do", "da",
    "um", "uma", "ja", "voce", "tem", "alguma", "ou", "se", "sim", "ha",
    "por", "que", "como", "quando", "sao", "esta", "estao",
  ];
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.includes(w))
      .slice(0, 3)
      .join("_") || "pergunta"
  );
}

const AdminConfigTriagem = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("tb_config_triagem")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) {
          setConfig({
            ...data,
            perguntas: (data.perguntas as Pergunta[]) || [],
          } as Config);
        }
      });
  }, []);

  const adicionarPergunta = () => {
    if (!config) return;
    const nova: Pergunta = {
      id: crypto.randomUUID(),
      ordem: config.perguntas.length + 1,
      texto: "",
      tipo: "texto",
      opcoes: [],
    };
    setConfig({ ...config, perguntas: [...config.perguntas, nova] });
  };

  const removerPergunta = (id: string) => {
    if (!config) return;
    setConfig({ ...config, perguntas: config.perguntas.filter((p) => p.id !== id) });
  };

  const moverPergunta = (index: number, dir: "cima" | "baixo") => {
    if (!config) return;
    const novas = [...config.perguntas];
    const novoIndex = dir === "cima" ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= novas.length) return;
    [novas[index], novas[novoIndex]] = [novas[novoIndex], novas[index]];
    setConfig({ ...config, perguntas: novas });
  };

  const atualizarPergunta = (id: string, campo: string, valor: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      perguntas: config.perguntas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    });
  };

  const inserirVariavel = (varName: string) => {
    const ta = document.getElementById("textarea-script-msg") as HTMLTextAreaElement;
    if (!ta || !config) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const novoValor = ta.value.substring(0, start) + varName + ta.value.substring(end);
    setConfig({ ...config, mensagem_whatsapp: novoValor });
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + varName.length;
      ta.focus();
    }, 0);
  };

  const salvar = async () => {
    if (!config?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tb_config_triagem")
        .update({
          perguntas: config.perguntas as unknown as Record<string, unknown>[],
          numero_whatsapp: config.numero_whatsapp,
          mensagem_whatsapp: config.mensagem_whatsapp,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);
      if (error) throw error;
      toast({ title: "✓ Configurações salvas!" });
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return <p className="text-muted-foreground text-sm">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-heading font-bold text-foreground">⚙️ Configurações da Triagem</h3>

      {/* Número WhatsApp */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">📱 Número de WhatsApp (com DDI)</label>
        <Input
          value={config.numero_whatsapp}
          onChange={(e) => setConfig({ ...config, numero_whatsapp: e.target.value })}
          placeholder="5582999381474"
        />
        <p className="text-xs text-muted-foreground">Formato: DDI + DDD + número. Ex: 5582999381474</p>
      </div>

      {/* Script da mensagem */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">💬 Script da mensagem WhatsApp</label>

        <div className="flex flex-wrap gap-1.5">
          {["{nome}", "{data}", "{horario}"].map((v) => (
            <button
              key={v}
              onClick={() => inserirVariavel(v)}
              className="rounded-md px-2 py-1 text-xs font-mono font-semibold border border-success/40 bg-success/10 text-success hover:bg-success/20 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>

        {config.perguntas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {config.perguntas.map((p) => {
              if (!p.texto?.trim()) return null;
              const slug = gerarSlugPergunta(p.texto);
              const varName = `{p_${slug}}`;
              return (
                <button
                  key={p.id}
                  onClick={() => inserirVariavel(varName)}
                  title={`Pergunta: "${p.texto}"`}
                  className="rounded-md px-2 py-1 text-xs font-mono font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {varName}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">↑ Clique em qualquer variável para inserir no ponto do cursor</p>

        <textarea
          id="textarea-script-msg"
          value={config.mensagem_whatsapp}
          onChange={(e) => setConfig({ ...config, mensagem_whatsapp: e.target.value })}
          rows={6}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </div>

      {/* Editor de perguntas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">❓ Perguntas da Triagem</label>
          <Button onClick={adicionarPergunta} size="sm" className="gradient-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        {config.perguntas.map((p, i) => (
          <div key={p.id} className="rounded-xl bg-secondary/30 border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">#{i + 1}</span>
              <button
                onClick={() => moverPergunta(i, "cima")}
                disabled={i === 0}
                className="p-1 rounded hover:bg-secondary disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moverPergunta(i, "baixo")}
                disabled={i === config.perguntas.length - 1}
                className="p-1 rounded hover:bg-secondary disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => removerPergunta(p.id)}
                className="p-1 rounded hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <Input
              value={p.texto}
              onChange={(e) => atualizarPergunta(p.id, "texto", e.target.value)}
              placeholder="Texto da pergunta..."
            />

            <div className="flex gap-2 items-center">
              <label className="text-xs text-muted-foreground">Tipo:</label>
              <select
                value={p.tipo}
                onChange={(e) => atualizarPergunta(p.id, "tipo", e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="texto">Texto livre</option>
                <option value="opcoes">Múltipla escolha</option>
              </select>
            </div>

            {p.tipo === "opcoes" && (
              <div>
                <label className="text-xs text-muted-foreground">Opções (uma por linha):</label>
                <textarea
                  value={(p.opcoes || []).join("\n")}
                  onChange={(e) => atualizarPergunta(p.id, "opcoes", e.target.value.split("\n"))}
                  rows={3}
                  placeholder={"Opção 1\nOpção 2\nOpção 3"}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={salvar}
        disabled={saving}
        className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : "💾 Salvar configurações"}
      </Button>
    </div>
  );
};

export default AdminConfigTriagem;
