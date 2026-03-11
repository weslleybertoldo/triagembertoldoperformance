import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Save } from "lucide-react";

interface Props {
  aluno: {
    id: string;
    nome: string | null;
    email?: string | null;
    whatsapp?: string | null;
  };
  onUpdate: () => void;
}

const formatWhatsApp = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const MeusDados = ({ aluno, onUpdate }: Props) => {
  const { toast } = useToast();
  const [whatsapp, setWhatsapp] = useState(aluno.whatsapp || "");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setWhatsapp(aluno.whatsapp || "");
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || aluno.email || "");
    });
  }, [aluno]);

  const handleSave = async () => {
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe um número com DDD + 9 dígitos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tb_alunos")
        .update({ whatsapp: digits })
        .eq("id", aluno.id);
      if (error) throw error;
      toast({ title: "Dados salvos!" });
      onUpdate();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasWhatsApp = !!(aluno.whatsapp && aluno.whatsapp.replace(/\D/g, "").length >= 10);

  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-card space-y-4">
      <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
        <Phone className="h-5 w-5 text-primary" /> Meus Dados
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground">Nome</label>
          <Input value={aluno.nome || ""} readOnly className="mt-1 bg-secondary/50 text-foreground" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <Input value={email} readOnly className="mt-1 bg-secondary/50 text-foreground" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">
            WhatsApp {!hasWhatsApp && <span className="text-destructive font-medium">*obrigatório</span>}
          </label>
          <Input
            value={formatWhatsApp(whatsapp)}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(XX) XXXXX-XXXX"
            className={`mt-1 ${!hasWhatsApp ? "border-destructive ring-destructive/20 ring-2" : ""}`}
          />
          {!hasWhatsApp && (
            <p className="text-xs text-destructive mt-1">
              Adicione seu WhatsApp para poder agendar consultas.
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gradient-primary text-primary-foreground rounded-xl font-heading font-semibold"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
};

export default MeusDados;
