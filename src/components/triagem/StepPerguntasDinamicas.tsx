import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Pergunta {
  id: string;
  ordem: number;
  texto: string;
  tipo: "texto" | "opcoes";
  opcoes?: string[];
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
  respostas: Record<string, string>;
  onUpdate: (respostas: Record<string, string>) => void;
  onNext: () => void;
}

const StepPerguntasDinamicas = ({ respostas, onUpdate, onNext }: Props) => {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tb_config_triagem")
      .select("perguntas")
      .limit(1)
      .single()
      .then(({ data }) => {
        const ps = (data?.perguntas as unknown as Pergunta[]) || [];
        setPerguntas(ps.filter((p) => p.texto?.trim()));
        setLoading(false);
      });
  }, []);

  const updateResposta = (slug: string, value: string) => {
    onUpdate({ ...respostas, [slug]: value });
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Carregando perguntas...</p>;
  }

  if (perguntas.length === 0) {
    // No dynamic questions configured, skip
    onNext();
    return null;
  }

  const allAnswered = perguntas.every((p) => {
    const slug = gerarSlug(p.texto);
    return respostas[slug]?.trim();
  });

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Mais algumas perguntas
      </h3>
      <p className="text-muted-foreground mb-6">
        Responda para podermos te ajudar melhor.
      </p>

      <div className="space-y-5">
        {perguntas.map((p, idx) => {
          const slug = gerarSlug(p.texto);
          return (
            <div key={p.id}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {idx + 1}. {p.texto}
              </label>
              {p.tipo === "opcoes" && p.opcoes && p.opcoes.length > 0 ? (
                <div className="space-y-2">
                  {p.opcoes.filter(Boolean).map((opcao) => (
                    <button
                      key={opcao}
                      onClick={() => updateResposta(slug, opcao)}
                      className={`w-full rounded-xl border-2 bg-card p-3 text-left transition-all text-sm ${
                        respostas[slug] === opcao
                          ? "border-primary ring-2 ring-primary/20 shadow-card"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={respostas[slug] || ""}
                  onChange={(e) => updateResposta(slug, e.target.value)}
                  placeholder="Sua resposta..."
                  className="min-h-[80px] text-base"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!allAnswered}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepPerguntasDinamicas;
