"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Info, X, ChevronDown, ChevronUp } from "lucide-react";

interface InfoItem {
  id: string;
  topic: string;
  title: string;
  content: string;
  order?: number;
  createdAt: string;
}

export default function InformationModal({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = query(collection(db, "information"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InfoItem));
      setItems(data);
      
      // Auto-expand all topics by default
      const topics: Record<string, boolean> = {};
      data.forEach(item => { topics[item.topic] = true; });
      setExpandedTopics(topics);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.topic]) acc[item.topic] = [];
    acc[item.topic].push(item);
    return acc;
  }, {} as Record<string, InfoItem[]>);

  const sortedTopics = Object.entries(groupedItems).sort(([topicA, itemsA], [topicB, itemsB]) => {
    const minA = Math.min(...itemsA.map(i => typeof i.order === "number" ? i.order : 999));
    const minB = Math.min(...itemsB.map(i => typeof i.order === "number" ? i.order : 999));
    if (minA !== minB) return minA - minB;
    return topicA.localeCompare(topicB);
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
      <div className="glass animate-fade-in" style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "600px", position: "relative", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        
        <button 
           onClick={onClose}
           style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", zIndex: 10 }}
        >
           <X size={24} />
        </button>

        <h3 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-primary)", fontSize: "1.25rem" }}>
          <Info size={24} color="var(--color-primary)" />
          Informações Úteis
        </h3>
        
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "0.5rem" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>A carregar...</p>
          ) : Object.keys(groupedItems).length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>Não existem informações publicadas no momento.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sortedTopics.map(([topic, topicItems]) => (
                <div key={topic} style={{ flexShrink: 0, background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                  <button 
                    onClick={() => toggleTopic(topic)}
                    style={{ width: "100%", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: "1rem" }}
                  >
                    {topic}
                    {expandedTopics[topic] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  
                  {expandedTopics[topic] && (
                    <div style={{ padding: "0 1rem 1rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {topicItems.map(item => (
                        <div key={item.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem", color: "var(--color-text-primary)" }}>{item.title}</h4>
                          <div 
                            className="quill-content-preview"
                            style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
