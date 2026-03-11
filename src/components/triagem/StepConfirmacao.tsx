import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  onHome: () => void;
}

const StepConfirmacao = ({ data, onHome }: Props) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
      <div className="text-center mb-8">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-4" />
        <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
          Agendamento realizado! 😊
        </h2>
        <p className="text-muted-foreground">
          Entraremos em contato em breve.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium text-foreground">{data.nome}</p>
        </div>
        {data.dataAgendamento && (
          <div>
            <p className="text-sm text-muted-foreground">Data e horário</p>
            <p className="font-medium text-foreground">
              {format(data.dataAgendamento, "EEEE, dd 'de' MMMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">WhatsApp</p>
          <p className="font-medium text-foreground">{data.whatsapp}</p>
        </div>
      </div>

      <Button
        onClick={onHome}
        className="mt-8 w-full max-w-sm py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
      >
        Voltar ao início
      </Button>
    </div>
  );
};

export default StepConfirmacao;
