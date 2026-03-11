import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const StepSaude = ({ data, update, onNext }: Props) => {
  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Possui algum problema de saúde?
      </h3>
      <p className="text-muted-foreground mb-8">
        Se não, apenas coloque um traço —
      </p>
      <Textarea
        placeholder="Descreva aqui ou coloque —"
        value={data.saude}
        onChange={(e) => update({ saude: e.target.value })}
        className="min-h-[120px] text-base"
      />
      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!data.saude.trim()}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepSaude;
