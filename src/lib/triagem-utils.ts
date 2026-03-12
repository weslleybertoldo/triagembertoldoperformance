/** Shared slug generator for triagem questions — used in form, admin, and detail views */
const STOPWORDS = [
  "qual", "e", "o", "a", "os", "as", "seu", "sua", "de", "do", "da",
  "um", "uma", "ja", "voce", "tem", "alguma", "ou", "se", "sim", "ha",
  "por", "que", "como", "quando", "sao", "esta", "estao",
];

export function gerarSlug(texto: string): string {
  return (
    "p_" +
    (texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.includes(w))
      .slice(0, 3)
      .join("_") || "pergunta")
  );
}

export interface PerguntaConfig {
  id: string;
  ordem: number;
  texto: string;
  subtexto?: string;
  tipo: "texto" | "opcoes";
  opcoes?: string[];
}
