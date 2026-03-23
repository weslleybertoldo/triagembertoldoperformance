import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/capacitorAuth";
import { useToast } from "@/hooks/use-toast";
import { CURRENT_VERSION } from "@/components/UpdateChecker";

const AlunoLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [nome, setNome] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/aluno");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      if (authData.user) {
        await supabase.from("tb_alunos").insert({
          id: authData.user.id,
          nome,
          email,
        });
      }
      toast({
        title: "Conta criada!",
        description: "Aguarde a liberação do seu acesso pelo administrador.",
      });
      setIsSignup(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      } else {
        navigate("/aluno");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao entrar com Google", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate("/")} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-heading font-semibold text-foreground">
          {isSignup ? "Criar conta" : "Área do Aluno"}
        </h2>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm space-y-4">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full py-6 text-base font-heading rounded-xl border-border"
          >
            Entrar com Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {isSignup && (
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="py-5"
            />
          )}
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="py-5"
          />
          <Input
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="py-5"
          />

          <Button
            onClick={isSignup ? handleSignup : handleLogin}
            disabled={loading || !email || !password || (isSignup && !nome)}
            className="w-full py-6 text-base font-heading font-semibold gradient-primary text-primary-foreground rounded-xl"
          >
            {loading ? "Carregando..." : isSignup ? "Criar conta" : "Entrar"}
          </Button>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            {isSignup ? "Já tenho conta" : "Criar conta"}
          </button>
        </div>
      </main>

      <div className="flex flex-col items-center gap-2 pb-6">
        <p className="text-xs text-muted-foreground/50">v{CURRENT_VERSION}</p>
        <button
          onClick={handleCheckUpdate}
          className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Verificar atualizações
        </button>
      </div>
    </div>
  );
};

export default AlunoLogin;
