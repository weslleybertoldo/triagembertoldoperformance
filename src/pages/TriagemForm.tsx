import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StepNome from "@/components/triagem/StepNome";
import StepDados from "@/components/triagem/StepDados";
import StepObjetivo from "@/components/triagem/StepObjetivo";
import StepWhatsapp from "@/components/triagem/StepWhatsapp";
import StepSaude from "@/components/triagem/StepSaude";
import StepAgendamento from "@/components/triagem/StepAgendamento";
import StepComoConheceu from "@/components/triagem/StepComoConheceu";
import StepPerguntasDinamicas from "@/components/triagem/StepPerguntasDinamicas";
import StepConfirmacao from "@/components/triagem/StepConfirmacao";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TriagemData {
  nome: string;
  dataNascimento: string;
  peso: string;
  altura: string;
  objetivo: string;
  whatsapp: string;
  saude: string;
  dataAgendamento: Date | null;
  comoConheceu: string;
  respostas: Record<string, string>;
}

const TOTAL_STEPS = 8;

const TriagemForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState<TriagemData>({
    nome: "",
    dataNascimento: "",
    peso: "",
    altura: "",
    objetivo: "",
    whatsapp: "",
    saude: "",
    dataAgendamento: null,
    comoConheceu: "",
    respostas: {},
  });

  const update = (fields: Partial<TriagemData>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tb_agendamentos_triagem").insert({
        nome: data.nome,
        data_nascimento: data.dataNascimento || null,
        peso: data.peso ? Number(data.peso) : null,
        altura: data.altura ? Number(data.altura) : null,
        objetivo: data.objetivo,
        whatsapp: data.whatsapp,
        saude: data.saude,
        data_agendamento: data.dataAgendamento?.toISOString(),
        como_conheceu: data.comoConheceu,
        respostas: data.respostas,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <StepConfirmacao data={data} onHome={() => navigate("/")} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => (step > 1 ? prev() : navigate("/"))}
          className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-heading font-semibold text-foreground">
          Agendamento
        </h2>
      </header>

      <div className="mx-4 mb-6">
        <div className="h-2 rounded-full bg-secondary">
          <div
            className="h-2 rounded-full gradient-primary transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground text-right">
          {step} de {TOTAL_STEPS}
        </p>
      </div>

      <main className="flex flex-1 flex-col px-6 pb-8">
        {step === 1 && <StepNome data={data} update={update} onNext={next} />}
        {step === 2 && <StepDados data={data} update={update} onNext={next} />}
        {step === 3 && <StepObjetivo data={data} update={update} onNext={next} />}
        {step === 4 && <StepWhatsapp data={data} update={update} onNext={next} />}
        {step === 5 && <StepSaude data={data} update={update} onNext={next} />}
        {step === 6 && (
          <StepPerguntasDinamicas
            respostas={data.respostas}
            onUpdate={(respostas) => update({ respostas })}
            onNext={next}
          />
        )}
        {step === 7 && <StepAgendamento data={data} update={update} onNext={next} />}
        {step === 8 && (
          <StepComoConheceu
            data={data}
            update={update}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </main>
    </div>
  );
};

export default TriagemForm;
