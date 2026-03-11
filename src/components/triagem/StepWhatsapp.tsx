import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  update: (fields: Partial<TriagemData>) => void;
  onNext: () => void;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const StepWhatsapp = ({ data, update, onNext }: Props) => {
  const digits = data.whatsapp.replace(/\D/g, "");
  const isValid = digits.length === 11;

  return (
    <div className="flex flex-1 flex-col">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-2">
        Qual é o seu WhatsApp?
      </h3>
      <p className="text-muted-foreground mb-8">
        Para entrarmos em contato com você.
      </p>
      <Input
        placeholder="(00) 00000-0000"
        value={data.whatsapp}
        onChange={(e) => update({ whatsapp: formatPhone(e.target.value) })}
        className="text-lg py-6"
        type="tel"
      />
      <div className="mt-auto pt-8">
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
        >
          Avançar
        </Button>
      </div>
    </div>
  );
};

export default StepWhatsapp;
