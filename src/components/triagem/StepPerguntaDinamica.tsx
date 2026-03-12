import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface Pergunta {
  id: string;
  ordem: number;
  texto: string;
  subtexto?: string;
  tipo: "texto" | "opcoes";
  opcoes?: string[];
}

const EMOJI_COLORS = [
  { emoji: "🔴", border: "border-destructive/30 hover:border-destructive" },
  { emoji: "🟢", border: "border-success/30 hover:border-success" },
  { emoji: "🟡", border: "border-warning/30 hover:border-warning" },
  { emoji: "🔵", border: "border-primary/30 hover:border-primary" },
  { emoji: "🟣", border: "border-accent/30 hover:border-accent" },
];

interface Props {
  pergunta: Pergunta;
  resposta: string;
  onResposta: (valor: string) => void;
  onNext: () => void;
  isLast: boolean;
  onSubmit?: () => void;
  submitting?: boolean;
}

const StepPerguntaDinamica = ({
  pergunta,
  resposta,
  onResposta,
  onNext,
  isLast,
  onSubmit,
  submitting,
}: Props) => {
  const [isOutro, setIsOutro] = useState(false);
  const [outroText, setOutroText] = useState("");

  const hasOutroOption =
    pergunta.tipo === "opcoes" &&
    pergunta.opcoes?.some((o) => o.toLowerCase() === "outro");

  const handleSelect = (value: string) => {
    if (value.toLowerCase() === "outro" && hasOutroOption) {
      setIsOutro(true);
      onResposta(outroText || "");
      return;
    }
    setIsOutro(false);
    onResposta(value);
    // Auto-advance for multiple choice (except last step)
    if (!isLast) {
      setTimeout(onNext, 300);
    }
  };

  const handleAction = () => {
    if (isLast && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  if (pergunta.tipo === "opcoes" && pergunta.opcoes && pergunta.opcoes.length > 0) {
    return (
      <div className="flex flex-1 flex-col">
        <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
          {pergunta.texto}
        </h3>
        {pergunta.subtexto && (
          <p className="text-muted-foreground mb-8">{pergunta.subtexto}</p>
        )}

        <div className="space-y-3">
          {pergunta.opcoes.filter(Boolean).map((opcao, idx) => {
            const isOutroOpt = opcao.toLowerCase() === "outro";
            const style = EMOJI_COLORS[idx % EMOJI_COLORS.length];
            const isSelected = isOutroOpt ? isOutro : resposta === opcao && !isOutro;

            return (
              <button
                key={opcao}
                onClick={() => handleSelect(opcao)}
                className={`w-full rounded-xl border-2 bg-card p-5 text-left transition-all duration-200 hover:shadow-card ${style.border} ${
                  isSelected ? "ring-2 ring-primary shadow-card scale-[1.02]" : ""
                }`}
              >
                <span className="text-2xl mr-3">{isOutroOpt ? "✏️" : style.emoji}</span>
                <span className="text-base font-heading font-medium text-foreground">
                  {opcao}
                </span>
              </button>
            );
          })}
        </div>

        {isOutro && (
          <Input
            placeholder="Digite aqui..."
            value={outroText}
            onChange={(e) => {
              setOutroText(e.target.value);
              onResposta(e.target.value);
            }}
            className="mt-3"
            autoFocus
          />
        )}

        {(isLast || isOutro) && (
          <div className="mt-auto pt-8">
            <Button
              onClick={handleAction}
              disabled={!resposta?.trim() || (isLast && submitting)}
              className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
            >
              {isLast ? (submitting ? "Enviando..." : "Enviar") : "Avançar"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Texto / texto longo
  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        {pergunta.texto}
      </h3>
      {pergunta.subtexto && (
        <p className="text-muted-foreground mb-8">{pergunta.subtexto}</p>
      )}
      <Textarea
        placeholder={pergunta.subtexto || "Descreva aqui..."}
        value={resposta || ""}
        onChange={(e) => onResposta(e.target.value)}
        className="min-h-[120px] text-base"
      />
      <div className="mt-auto pt-8">
        <Button
          onClick={handleAction}
          disabled={!resposta?.trim() || (isLast && submitting)}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          {isLast ? (submitting ? "Enviando..." : "Enviar") : "Avançar"}
        </Button>
      </div>
    </div>
  );
};

export default StepPerguntaDinamica;
