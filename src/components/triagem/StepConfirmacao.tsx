import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TriagemData } from "@/pages/TriagemForm";

interface Props {
  data: TriagemData;
  onHome: () => void;
}

const StepConfirmacao = ({ data, onHome }: Props) => {
  const [whatsappLink, setWhatsappLink] = useState<string>("");

  useEffect(() => {
    const buildLink = async () => {
      try {
        const { data: config } = await supabase
          .from("tb_config_triagem")
          .select("numero_whatsapp, mensagem_whatsapp")
          .single();

        const numero = config?.numero_whatsapp ?? "5582999381474";
        const script =
          config?.mensagem_whatsapp ??
          "Olá! Acabei de solicitar minha consulta grátis pelo app Team Bertoldo.\n\nNome: {nome}\nData: {data}\nHorário: {horario}";

        const dataFormatada = data.dataAgendamento
          ? format(data.dataAgendamento, "dd/MM/yyyy", { locale: ptBR })
          : "";
        const horaFormatada = data.dataAgendamento
          ? format(data.dataAgendamento, "HH:mm")
          : "";

        let mensagem = script
          .replaceAll("{nome}", data.nome ?? "")
          .replaceAll("{data}", dataFormatada)
          .replaceAll("{horario}", horaFormatada);

        // Clean up any remaining template variables
        mensagem = mensagem.replace(/\{p_[a-z0-9_]+\}/g, "");

        setWhatsappLink(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`);
      } catch {
        // Fallback link
        const msg = `Olá! Acabei de solicitar minha consulta grátis pelo app Team Bertoldo.\n\nNome: ${data.nome}`;
        setWhatsappLink(`https://wa.me/5582999381474?text=${encodeURIComponent(msg)}`);
      }
    };
    buildLink();
  }, [data]);

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

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full max-w-sm flex items-center justify-center gap-2.5 rounded-xl py-4 px-6 font-heading font-bold text-base text-white no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" />
          Entrar em contato pelo WhatsApp
        </a>
      )}

      <Button
        onClick={onHome}
        className="mt-4 w-full max-w-sm py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
      >
        Voltar ao início
      </Button>
    </div>
  );
};

export default StepConfirmacao;
