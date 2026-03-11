import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const StepNome = ({ data, update, onNext }: Props) => {
  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Qual é o seu nome?
      </h3>
      <p className="text-muted-foreground mb-8">
        Nos conte como devemos te chamar.
      </p>
      <Input
        placeholder="Seu nome completo"
        value={data.nome}
        onChange={(e) => update({ nome: e.target.value })}
        className="text-lg py-6"
        autoFocus
      />
      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!data.nome.trim()}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepNome;
