import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onSubmit: () => void;
  submitting: boolean;
}

const options = [
  { value: "Instagram", emoji: "📱" },
  { value: "Indicação de um amigo", emoji: "👥" },
  { value: "WhatsApp", emoji: "💬" },
];

const StepComoConheceu = ({ data, update, onSubmit, submitting }: Props) => {
  const [isOutro, setIsOutro] = useState(false);
  const [outroText, setOutroText] = useState("");

  const handleSelect = (value: string) => {
    setIsOutro(false);
    update({ comoConheceu: value });
  };

  const handleOutro = () => {
    setIsOutro(true);
    update({ comoConheceu: outroText });
  };

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Por onde ficou sabendo?
      </h3>
      <p className="text-muted-foreground mb-8">
        Nos ajude a melhorar nosso alcance.
      </p>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`w-full rounded-xl border-2 bg-card p-4 text-left transition-all ${
              data.comoConheceu === opt.value && !isOutro
                ? "border-primary ring-2 ring-primary/20 shadow-card"
                : "border-border hover:border-primary/30"
            }`}
          >
            <span className="mr-3">{opt.emoji}</span>
            <span className="font-medium text-foreground">{opt.value}</span>
          </button>
        ))}

        <button
          onClick={handleOutro}
          className={`w-full rounded-xl border-2 bg-card p-4 text-left transition-all ${
            isOutro
              ? "border-primary ring-2 ring-primary/20 shadow-card"
              : "border-border hover:border-primary/30"
          }`}
        >
          <span className="mr-3">✏️</span>
          <span className="font-medium text-foreground">Outro</span>
        </button>

        {isOutro && (
          <Input
            placeholder="Como nos conheceu?"
            value={outroText}
            onChange={(e) => {
              setOutroText(e.target.value);
              update({ comoConheceu: e.target.value });
            }}
            className="mt-2"
            autoFocus
          />
        )}
      </div>

      <div className="mt-auto pt-8">
        <Button
          onClick={onSubmit}
          disabled={!data.comoConheceu.trim() || submitting}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
};

export default StepComoConheceu;
