"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { Bell, X, Check, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersonId: string;
  usersMap: Record<string, string>;
  allVigiaIds?: string[]; // Used when selectedPersonId === "all"
}

export default function NotificationModal({ isOpen, onClose, selectedPersonId, usersMap, allVigiaIds = [] }: NotificationModalProps) {
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [vigiaNotifications, setVigiaNotifications] = useState<Notification[]>([]);

  // Load chat history if a single vigia is selected
  useEffect(() => {
    if (!isOpen || !selectedPersonId || selectedPersonId === "all") {
      setVigiaNotifications([]);
      return;
    }
    const q = query(
      collection(db, "notifications"), 
      where("vigiaId", "==", selectedPersonId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB; // Oldest first (bottom up)
      });
      setVigiaNotifications(notifs);
    });
    return () => unsubscribe();
  }, [isOpen, selectedPersonId]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      if (selectedPersonId === "all") {
        const uniqueVigias = Array.from(new Set(allVigiaIds));
        await Promise.all(uniqueVigias.map(async (vid) => {
          await addDoc(collection(db, "notifications"), {
            vigiaId: vid,
            message: notifMessage.trim(),
            read: false,
            dismissed: false,
            createdAt: new Date().toISOString()
          });
          await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vigiaId: vid,
              title: "Mensagem do Capitão",
              message: notifMessage.trim()
            })
          });
        }));
      } else {
        // 1. Save to Firestore (for in-app notification when app is open)
        await addDoc(collection(db, "notifications"), {
          vigiaId: selectedPersonId,
          message: notifMessage.trim(),
          read: false,
          dismissed: false,
          createdAt: new Date().toISOString()
        });

        // 2. Send FCM push notification (works when app is closed/background)
        const response = await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vigiaId: selectedPersonId,
            title: "Mensagem do Capitão",
            message: notifMessage.trim()
          })
        });
        if (!response.ok) throw new Error("Falha ao enviar push");
      }
      alert("Notificação enviada com sucesso!");
      setNotifMessage("");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação.");
    } finally {
      setSendingNotif(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
      <div className="glass animate-fade-in" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        
        <button 
           onClick={onClose}
           style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
        >
           <X size={20} />
        </button>

        <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 0 }}>
          <Bell size={20} color="var(--color-primary)" />
          Enviar Notificação
        </h3>
        
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          {selectedPersonId === "all" 
             ? "Escreva a mensagem que deseja enviar para TODOS os Vigias desta zona." 
             : <>Escreva a mensagem que deseja enviar para o dispositivo do Vigia <strong>{usersMap[selectedPersonId] || "Desconhecido"}</strong>.</>}
        </p>

        {vigiaNotifications.length > 0 && (
          <div style={{ marginBottom: "1rem", maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.5rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
            {vigiaNotifications.map(n => {
              const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={n.id} style={{ background: "var(--color-surface)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", border: "1px solid var(--color-border)" }}>
                  <p style={{ margin: "0 0 0.25rem", color: "var(--color-text-primary)" }}>{n.message}</p>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: "var(--color-text-tertiary)" }}>
                    {timeStr}
                    {n.read ? <CheckCheck size={14} color="#3b82f6" /> : <Check size={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSendNotification} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
              Mensagem
            </label>
            <textarea
              className="input"
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              required
              rows={3}
              placeholder="Ex: Preciso de apoio no portão sul..."
              style={{ resize: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {["Dirija-se ao posto de controlo.", "Contacte o Capitão de Zona com urgência.", "Há uma ocorrência na sua área. Atenção redobrada."].map(preset => (
              <button key={preset} type="button" onClick={() => setNotifMessage(preset)} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: notifMessage === preset ? "var(--color-primary-light)" : "var(--color-bg)", color: notifMessage === preset ? "var(--color-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>
                {preset}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sendingNotif}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-danger" disabled={sendingNotif || !notifMessage.trim()}>
              {sendingNotif ? "A enviar..." : "Enviar Push"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
