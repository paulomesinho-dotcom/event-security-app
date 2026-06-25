"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy, getDoc } from "firebase/firestore";
import { Bell, Trash2, Edit2, Plus, Info, Check, X } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['link'],
    ['clean']
  ],
};

interface InfoItem {
  id: string;
  topic: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function InformationManager({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);



  // Form State
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const q = query(collection(db, "information"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InfoItem));
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !title.trim() || !content.trim()) return;

    try {
      if (isEditing) {
        await updateDoc(doc(db, "information", isEditing), {
          topic: topic.trim(),
          title: title.trim(),
          content: content.trim()
        });
        setIsEditing(null);
      } else {
        await addDoc(collection(db, "information"), {
          topic: topic.trim(),
          title: title.trim(),
          content: content.trim(),
          createdAt: new Date().toISOString()
        });
      }
      setTopic("");
      setTitle("");
      setContent("");
    } catch (error) {
      console.error("Error saving information:", error);
      alert("Erro ao guardar informação.");
    }
  };

  const handleEdit = (item: InfoItem) => {
    setIsEditing(item.id);
    setTopic(item.topic);
    setTitle(item.title);
    setContent(item.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que deseja apagar esta informação?")) {
      try {
        await deleteDoc(doc(db, "information", id));
      } catch (error) {
        console.error("Error deleting information:", error);
        alert("Erro ao apagar informação.");
      }
    }
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setTopic("");
    setTitle("");
    setContent("");
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>A carregar...</div>;

  // Group items by topic
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.topic]) acc[item.topic] = [];
    acc[item.topic].push(item);
    return acc;
  }, {} as Record<string, InfoItem[]>);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ background: "var(--color-primary)", color: "white", padding: "0.5rem", borderRadius: "0.5rem" }}>
          <Info size={24} />
        </div>
        <h2 style={{ margin: 0, color: "var(--color-text-primary)" }}>{readOnly ? "Informações Globais" : "Gestão de Informação (Global)"}</h2>
      </div>

      {readOnly && (
        <div style={{ 
           background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.2)", 
           borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "2rem",
           display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
        }}>
           <div style={{ fontSize: "0.95rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
             Consulte aqui as regras e normas do evento.
           </div>
        </div>
      )}

      {!readOnly && (
        <div className="glass" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
          {isEditing ? "Editar Informação" : "Criar Nova Informação"}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <div>
              <label className="label">Tópico / Categoria</label>
              <input
                type="text"
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Normas de Segurança"
                required
                list="topic-list"
              />
              <datalist id="topic-list">
                {Object.keys(groupedItems).map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Utilização de Rádios"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="label">Conteúdo</label>
            <div className="quill-wrapper">
              <ReactQuill 
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                placeholder="Escreva a informação aqui..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            {isEditing && (
              <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {isEditing ? <><Check size={16} /> Guardar Alterações</> : <><Plus size={16} /> Criar Informação</>}
            </button>
          </div>
        </form>
      </div>
      )}

      <h3 style={{ margin: "0 0 1rem 0", color: "var(--color-text-primary)" }}>Informações Publicadas</h3>
      
      {Object.keys(groupedItems).length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--color-border)" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Ainda não foram publicadas informações.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(groupedItems).map(([grpTopic, grpItems]) => (
            <div key={grpTopic} style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
              <div style={{ background: "var(--color-bg)", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)" }}>
                <h4 style={{ margin: 0, color: "var(--color-primary)" }}>{grpTopic}</h4>
              </div>
              <div>
                {grpItems.map(item => (
                  <div key={item.id} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div>
                      <h5 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{item.title}</h5>
                      <div 
                        className="quill-content-preview"
                        style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)", wordBreak: "break-word" }}
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </div>
                    {!readOnly && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleEdit(item)} className="btn btn-secondary" style={{ padding: "0.4rem", color: "var(--color-text-secondary)" }} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-secondary" style={{ padding: "0.4rem", color: "var(--color-danger)" }} title="Apagar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
