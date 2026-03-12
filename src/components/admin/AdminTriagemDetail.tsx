import { useState, useEffect } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Pergunta {
  id: string;
  ordem: number;
  texto: string;
  tipo: string;
}

function gerarSlug(texto: string): string {
  const stopwords = [
    "qual", "e", "o", "a", "os", "as", "seu", "sua", "de", "do", "da",
    "um", "uma", "ja", "voce", "tem", "alguma", "ou", "se", "sim", "ha",
    "por", "que", "como", "quando", "sao", "esta", "estao",
  ];
  return (
    "p_" +
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.includes(w))
      .slice(0, 3)
      .join("_") || "p_pergunta"
  );
}

interface Props {
  triagem: any;
  onBack: () => void;
  onExportPDF: () => void;
}

const AdminTriagemDetail = ({ triagem, onBack, onExportPDF }: Props) => {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const respostas: Record<string, string> = triagem.respostas || {};

  useEffect(() => {
    supabase
      .from("tb_config_triagem")
      .select("perguntas")
      .limit(1)
      .single()
      .then(({ data }) => {
        const ps = (data?.perguntas as unknown as Pergunta[]) || [];
        setPerguntas(ps.filter((p) => p.texto?.trim()));
      });
  }, []);

  const fields = [
    { label: "Nome", value: triagem.nome },
    { label: "WhatsApp", value: triagem.whatsapp },
    { label: "Objetivo", value: triagem.objetivo },
    { label: "Data Agendada", value: triagem.data_agendamento ? format(new Date(triagem.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—" },
    { label: "Data Nascimento", value: triagem.data_nascimento || "—" },
    { label: "Peso", value: triagem.peso ? `${triagem.peso} kg` : "—" },
    { label: "Altura", value: triagem.altura ? `${triagem.altura} cm` : "—" },
    { label: "Saúde", value: triagem.saude || "—" },
    { label: "Como Conheceu", value: triagem.como_conheceu || "—" },
    { label: "Status", value: triagem.status },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={onBack} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-heading font-semibold text-foreground">Detalhes da Triagem</h2>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4">
        {/* Fixed fields */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-sm text-muted-foreground">{f.label}</p>
              <p className="font-medium text-foreground">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Dynamic questions & answers */}
        {perguntas.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
            <h3 className="text-base font-heading font-bold text-foreground">❓ Perguntas da Triagem</h3>
            {perguntas.map((p, idx) => {
              const slug = gerarSlug(p.texto);
              const resposta = respostas[slug];
              return (
                <div key={p.id} className="rounded-xl bg-secondary/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pergunta {idx + 1}</p>
                  <p className="text-sm font-semibold text-foreground mb-1">{p.texto}</p>
                  <p className={`text-sm ${resposta ? "text-success font-medium" : "text-muted-foreground italic"}`}>
                    {resposta || "Sem resposta"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <Button onClick={onExportPDF} className="w-full py-5 font-heading gradient-primary text-primary-foreground rounded-xl">
          <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
        </Button>
      </main>
    </div>
  );
};

export default AdminTriagemDetail;
