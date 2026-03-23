import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, RefreshCw, Check, Download } from "lucide-react";
import UpdateChecker, { CURRENT_VERSION } from "@/components/UpdateChecker";

const Index = () => {
  const navigate = useNavigate();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<null | { hasUpdate: boolean; url?: string; version?: string }>(null);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await fetch("https://api.github.com/repos/weslleybertoldo/triagembertoldoperformance/releases/latest", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const release = await res.json();
      const rv = (release.tag_name || "").replace(/^v/, "");
      const r = rv.split(".").map(Number);
      const l = CURRENT_VERSION.split(".").map(Number);
      const isNewer = r[0]>l[0] || (r[0]===l[0]&&r[1]>l[1]) || (r[0]===l[0]&&r[1]===l[1]&&r[2]>l[2]);
      if (isNewer) {
        const apk = (release.assets||[]).find((a:any)=>a.name.endsWith(".apk"));
        setUpdateResult({ hasUpdate: true, url: apk?.browser_download_url || release.html_url, version: rv });
      } else {
        setUpdateResult({ hasUpdate: false });
      }
    } catch {
      setUpdateResult({ hasUpdate: false });
    } finally {
      setCheckingUpdate(false);
    }
  };

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
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 mt-8">
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
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">By Weslley Bertoldo</span>
          <button
            onClick={() => navigate("/admin")}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Admin"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center mt-2 space-y-1">
          <p className="text-[10px] text-muted-foreground/50">v{CURRENT_VERSION}</p>
          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors mx-auto flex items-center justify-center gap-1"
          >
            <RefreshCw size={10} className={checkingUpdate ? "animate-spin" : ""} />
            Verificar atualizações
          </button>
          {updateResult && (
            <div>
              {updateResult.hasUpdate ? (
                <a href={updateResult.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center justify-center gap-1">
                  <Download size={10} /> Baixar v{updateResult.version}
                </a>
              ) : (
                <p className="text-[10px] text-green-500 flex items-center justify-center gap-1">
                  <Check size={10} /> Versão mais recente
                </p>
              )}
            </div>
          )}
        </div>
      </footer>

      <UpdateChecker />
    </div>
  );
};

export default Index;
