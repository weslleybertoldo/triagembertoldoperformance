import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

const isNative = Capacitor.isNativePlatform();
const SITE_URL = "https://triagembertoldoperformance.lovable.app";

/**
 * Inicia o login com Google.
 * - No APK: abre browser externo com redirect para o site HTTPS (já permitido no Supabase)
 *   Quando o usuário fecha o browser, verifica se a sessão foi criada.
 * - No PWA: usa o fluxo normal de redirect do Supabase
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!isNative) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return {};
  }

  // APK — abre OAuth no browser, redirect para o site HTTPS
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: SITE_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return { error: error?.message || "Erro ao iniciar login" };
    }

    // Escuta quando o browser fecha (usuário volta pro app)
    const sessionPromise = new Promise<{ error?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ error: "Login cancelado ou expirado" });
      }, 180000); // 3 min

      const checkSession = async () => {
        clearTimeout(timeout);
        // Aguarda um momento para o Supabase processar
        await new Promise(r => setTimeout(r, 1000));

        // Verifica se uma sessão foi criada
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.getUser();
          resolve({});
        } else {
          resolve({ error: "Login não concluído. Tente novamente." });
        }
      };

      Browser.addListener("browserFinished", checkSession);

      sessionPromise.then(() => {
        Browser.removeAllListeners();
      });
    });

    await Browser.open({ url: data.url });
    return await sessionPromise;
  } catch {
    return { error: "Erro ao abrir login do Google" };
  }
}

/**
 * Inicializa listener (simplificado — sem deep link necessário)
 */
export function setupDeepLinkListener() {
  // Não precisa de deep link — usa redirect HTTPS
}
