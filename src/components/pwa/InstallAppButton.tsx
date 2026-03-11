import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallAppButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      setShowInstructions(!showInstructions);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-success" />
        App já instalado
      </div>
    );
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="space-y-2">
      <Button
        onClick={handleInstall}
        variant="outline"
        className="w-full rounded-xl border-border"
      >
        <Smartphone className="h-4 w-4 mr-2" />
        📲 Instalar App
      </Button>
      {showInstructions && !deferredPrompt && (
        <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground space-y-1">
          {isIOS ? (
            <p>No Safari: toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong></p>
          ) : isAndroid ? (
            <p>No Chrome: toque em <strong>Menu ⋮</strong> → <strong>Adicionar à tela inicial</strong></p>
          ) : (
            <>
              <p><strong>Android Chrome:</strong> Menu ⋮ → Adicionar à tela inicial</p>
              <p><strong>iPhone Safari:</strong> Compartilhar → Adicionar à Tela de Início</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InstallAppButton;
