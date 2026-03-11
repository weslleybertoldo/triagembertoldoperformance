import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface Props {
  onTagsChange?: () => void;
}

const AdminTags = ({ onTagsChange }: Props) => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#1a5632");

  const fetchTags = async () => {
    try {
      const res = await adminApi("list_tags");
      setTags(res.data || []);
    } catch {}
  };

  useEffect(() => { fetchTags(); }, []);

  const addTag = async () => {
    if (!nome.trim()) return;
    await adminApi("create_tag", { nome, cor });
    setNome("");
    fetchTags();
    onTagsChange?.();
    toast({ title: "Tag criada" });
  };

  const deleteTag = async (id: string) => {
    await adminApi("delete_tag", { id });
    fetchTags();
    onTagsChange?.();
  };

  return (
    <section>
      <h3 className="text-lg font-heading font-bold text-foreground mb-4">🏷️ Tags</h3>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Nome da tag" value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1" />
        <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
        <Button onClick={addTag} variant="outline" size="sm">Criar</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <div key={t.id} className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: t.cor + "20", color: t.cor }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.cor }} />
            {t.nome}
            <button onClick={() => deleteTag(t.id)} className="ml-1 opacity-60 hover:opacity-100">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminTags;
