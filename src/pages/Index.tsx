import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-center pt-10 pb-2 px-4">
        <img
          src="/icon-512.png"
          alt="Team Bertoldo"
          className="h-[150px] w-[150px] md:h-[200px] md:w-[200px] rounded-3xl object-contain"
        />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24">
        <button
          onClick={() => navigate("/triagem")}
          className="w-full max-w-sm rounded-2xl gradient-primary p-8 text-center shadow-card transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-4xl mb-3 block">🟢</span>
          <span className="text-lg font-heading font-semibold text-primary-foreground">
            Quero agendar minha consulta grátis
          </span>
        </button>

        <button
          onClick={() => navigate("/aluno/login")}
          className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-card border border-border transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-4xl mb-3 block">🔵</span>
          <span className="text-lg font-heading font-semibold text-foreground">
            Já sou aluno
          </span>
        </button>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <span className="text-sm text-muted-foreground">By Weslley Bertoldo</span>
        <button
          onClick={() => navigate("/admin")}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Admin"
        >
          <Settings className="h-5 w-5" />
        </button>
      </footer>
    </div>
  );
};

export default Index;
