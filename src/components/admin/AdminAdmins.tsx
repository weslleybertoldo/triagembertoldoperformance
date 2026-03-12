import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShieldAlert } from "lucide-react";

interface Admin {
  id: string;
  email: string;
  criado_em: string;
}

const ADMIN_PRINCIPAL = "weslleybertoldo18@gmail.com";

const AdminAdmins = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAdmins = async () => {
    try {
      const res = await adminApi("list_admins");
      setAdmins(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchAdmins(); }, []);

  const addAdmin = async () => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !trimmed.includes("@")) return;
    setLoading(true);
    try {
      await adminApi("create_admin", { email: trimmed });
      setEmail("");
      fetchAdmins();
      toast({ title: "Admin adicionado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const removeAdmin = async (admin: Admin) => {
    if (admin.email === ADMIN_PRINCIPAL) {
      toast({ title: "Protegido", description: "Este admin não pode ser removido.", variant: "destructive" });
      return;
    }
    try {
      await adminApi("delete_admin", { id: admin.id });
      fetchAdmins();
      toast({ title: "Admin removido" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-heading font-bold text-foreground">👤 Gerenciamento de Admins</h3>

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-3 shadow-card">
            <div>
              <p className="text-sm font-medium text-foreground">{a.email}</p>
              {a.email === ADMIN_PRINCIPAL && (
                <span className="text-[11px] text-muted-foreground">(admin principal)</span>
              )}
            </div>
            {a.email === ADMIN_PRINCIPAL ? (
              <span className="text-xs text-muted-foreground">protegido</span>
            ) : (
              <button
                onClick={() => removeAdmin(a)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                title="Remover admin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="E-mail do novo admin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAdmin()}
          className="flex-1"
        />
        <Button onClick={addAdmin} disabled={loading} variant="outline" size="sm">
          Adicionar
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3">
        <ShieldAlert className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <p className="text-xs text-warning">Admins têm acesso total ao painel.</p>
      </div>
    </section>
  );
};

export default AdminAdmins;
