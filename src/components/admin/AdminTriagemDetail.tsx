import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  triagem: any;
  onBack: () => void;
  onExportPDF: () => void;
}

const AdminTriagemDetail = ({ triagem, onBack, onExportPDF }: Props) => {
  const fields = [
    { label: "Nome", value: triagem.nome },
    { label: "WhatsApp", value: triagem.whatsapp },
    { label: "Objetivo", value: triagem.objetivo },
    { label: "Data Agendada", value: triagem.data_agendamento ? format(new Date(triagem.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—" },
    { label: "Data Nascimento", value: triagem.data_nascimento || "—" },
    { label: "Peso", value: triagem.peso ? `${triagem.peso} kg` : "—" },
    { label: "Altura", value: triagem.altura ? `${triagem.altura} cm` : "—" },
    { label: "Saúde", value: triagem.saude || "—" },
    { label: "Como Conheceu", value: triagem.como_conheceu || "—" },
    { label: "Status", value: triagem.status },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={onBack} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-heading font-semibold text-foreground">Detalhes</h2>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-sm text-muted-foreground">{f.label}</p>
              <p className="font-medium text-foreground">{f.value}</p>
            </div>
          ))}
        </div>

        <Button onClick={onExportPDF} className="mt-6 w-full py-5 font-heading gradient-primary text-primary-foreground rounded-xl">
          <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
        </Button>
      </main>
    </div>
  );
};

export default AdminTriagemDetail;
