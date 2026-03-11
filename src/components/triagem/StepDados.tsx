import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const StepDados = ({ data, update, onNext }: Props) => {
  const canAdvance = data.dataNascimento && data.peso && data.altura;

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Dados pessoais
      </h3>
      <p className="text-muted-foreground mb-8">
        Precisamos de algumas informações básicas.
      </p>

      <div className="space-y-5">
        <div>
          <Label className="text-sm font-medium text-foreground mb-1.5 block">
            Data de nascimento
          </Label>
          <Input
            type="date"
            value={data.dataNascimento}
            onChange={(e) => update({ dataNascimento: e.target.value })}
            className="py-5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground mb-1.5 block">
            Peso (kg)
          </Label>
          <Input
            type="number"
            placeholder="Ex: 75"
            value={data.peso}
            onChange={(e) => update({ peso: e.target.value })}
            className="py-5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground mb-1.5 block">
            Altura (cm)
          </Label>
          <Input
            type="number"
            placeholder="Ex: 175"
            value={data.altura}
            onChange={(e) => update({ altura: e.target.value })}
            className="py-5"
          />
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!canAdvance}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepDados;
