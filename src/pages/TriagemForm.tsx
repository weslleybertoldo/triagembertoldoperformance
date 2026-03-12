import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StepNome from "@/components/triagem/StepNome";
import StepDados from "@/components/triagem/StepDados";
import StepWhatsapp from "@/components/triagem/StepWhatsapp";
import StepAgendamento from "@/components/triagem/StepAgendamento";
import StepPerguntaDinamica from "@/components/triagem/StepPerguntaDinamica";
import StepConfirmacao from "@/components/triagem/StepConfirmacao";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gerarSlug, type PerguntaConfig } from "@/lib/triagem-utils";

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

// Fixed step keys
type FixedStep = "nome" | "dados" | "whatsapp" | "agendamento";

type StepDef =
  | { type: "fixed"; key: FixedStep }
  | { type: "dynamic"; pergunta: PerguntaConfig };

const TriagemForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [loadingPerguntas, setLoadingPerguntas] = useState(true);
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

  useEffect(() => {
    supabase
      .from("tb_config_triagem")
      .select("perguntas")
      .limit(1)
      .single()
      .then(({ data: cfg }) => {
        const ps = (cfg?.perguntas as unknown as PerguntaConfig[]) || [];
        setPerguntas(ps.filter((p) => p.texto?.trim()));
        setLoadingPerguntas(false);
      });
  }, []);

  const update = (fields: Partial<TriagemData>) =>
    setData((prev) => ({ ...prev, ...fields }));

  // Build step sequence: fixed + dynamic interleaved
  // Order: nome → dados → whatsapp → [dynamic questions sorted by ordem] → agendamento
  const steps: StepDef[] = loadingPerguntas
    ? [{ type: "fixed", key: "nome" }]
    : [
        { type: "fixed", key: "nome" },
        { type: "fixed", key: "dados" },
        { type: "fixed", key: "whatsapp" },
        ...perguntas
          .sort((a, b) => a.ordem - b.ordem)
          .map((p): StepDef => ({ type: "dynamic", pergunta: p })),
        { type: "fixed", key: "agendamento" },
      ];

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];

  const next = () => setStepIndex((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStepIndex((s) => Math.max(s - 1, 0));

  // Map known slugs back to structured columns
  const SLUG_TO_COLUMN: Record<string, keyof TriagemData> = {};
  perguntas.forEach((p) => {
    const slug = gerarSlug(p.texto);
    const lower = p.texto.toLowerCase();
    if (lower.includes("objetivo")) SLUG_TO_COLUMN[slug] = "objetivo";
    else if (lower.includes("saúde") || lower.includes("saude")) SLUG_TO_COLUMN[slug] = "saude";
    else if (lower.includes("sabendo") || lower.includes("conheceu")) SLUG_TO_COLUMN[slug] = "comoConheceu";
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Build structured fields from respostas
      const objetivo = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "objetivo");
      const saude = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "saude");
      const como = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "comoConheceu");

      const { error } = await supabase.from("tb_agendamentos_triagem").insert({
        nome: data.nome,
        data_nascimento: data.dataNascimento || null,
        peso: data.peso ? Number(data.peso) : null,
        altura: data.altura ? Number(data.altura) : null,
        objetivo: objetivo ? data.respostas[objetivo[0]] || null : null,
        whatsapp: data.whatsapp,
        saude: saude ? data.respostas[saude[0]] || null : null,
        data_agendamento: data.dataAgendamento?.toISOString(),
        como_conheceu: como ? data.respostas[como[0]] || null : null,
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
    // Populate data fields for confirmation screen
    const finalData = { ...data };
    const objetivo = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "objetivo");
    if (objetivo) finalData.objetivo = data.respostas[objetivo[0]] || "";
    const saude = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "saude");
    if (saude) finalData.saude = data.respostas[saude[0]] || "";
    const como = Object.entries(SLUG_TO_COLUMN).find(([, v]) => v === "comoConheceu");
    if (como) finalData.comoConheceu = data.respostas[como[0]] || "";
    return <StepConfirmacao data={finalData} onHome={() => navigate("/")} />;
  }

  if (loadingPerguntas) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Check if current dynamic step is the last step before agendamento
  const isLastDynamic =
    currentStep?.type === "dynamic" &&
    stepIndex === totalSteps - 2; // agendamento is last

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => (stepIndex > 0 ? prev() : navigate("/"))}
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
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground text-right">
          {stepIndex + 1} de {totalSteps}
        </p>
      </div>

      <main className="flex flex-1 flex-col px-6 pb-8">
        {currentStep?.type === "fixed" && currentStep.key === "nome" && (
          <StepNome data={data} update={update} onNext={next} />
        )}
        {currentStep?.type === "fixed" && currentStep.key === "dados" && (
          <StepDados data={data} update={update} onNext={next} />
        )}
        {currentStep?.type === "fixed" && currentStep.key === "whatsapp" && (
          <StepWhatsapp data={data} update={update} onNext={next} />
        )}
        {currentStep?.type === "fixed" && currentStep.key === "agendamento" && (
          <StepAgendamento
            data={data}
            update={update}
            onNext={handleSubmit}
          />
        )}
        {currentStep?.type === "dynamic" && (() => {
          const slug = gerarSlug(currentStep.pergunta.texto);
          const isLast = stepIndex === totalSteps - 2;
          return (
            <StepPerguntaDinamica
              key={currentStep.pergunta.id}
              pergunta={currentStep.pergunta}
              resposta={data.respostas[slug] || ""}
              onResposta={(val) =>
                update({ respostas: { ...data.respostas, [slug]: val } })
              }
              onNext={next}
              isLast={false}
            />
          );
        })()}
      </main>
    </div>
  );
};

export default TriagemForm;
