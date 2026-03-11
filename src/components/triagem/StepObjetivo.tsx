import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const objectives = [
  { value: "Perder peso", emoji: "🔴", color: "border-destructive/30 hover:border-destructive" },
  { value: "Ganhar peso", emoji: "🟢", color: "border-success/30 hover:border-success" },
  { value: "Manter peso", emoji: "🟡", color: "border-warning/30 hover:border-warning" },
];

const StepObjetivo = ({ data, update, onNext }: Props) => {
  const handleSelect = (value: string) => {
    update({ objetivo: value });
    setTimeout(onNext, 300);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Qual é o seu objetivo?
      </h3>
      <p className="text-muted-foreground mb-8">
        Selecione o que mais se encaixa com você.
      </p>

      <div className="space-y-4">
        {objectives.map((obj) => (
          <button
            key={obj.value}
            onClick={() => handleSelect(obj.value)}
            className={`w-full rounded-xl border-2 bg-card p-5 text-left transition-all duration-200 hover:shadow-card ${obj.color} ${
              data.objetivo === obj.value
                ? "ring-2 ring-primary shadow-card scale-[1.02]"
                : ""
            }`}
          >
            <span className="text-2xl mr-3">{obj.emoji}</span>
            <span className="text-base font-heading font-medium text-foreground">
              {obj.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepObjetivo;
