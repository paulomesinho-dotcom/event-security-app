"use client";

import { useState, useEffect } from "react";
import { storage, db } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, serverTimestamp, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { UploadCloud, Trash2, Map, Plus, X } from "lucide-react";
import Image from "next/image";

interface Plan {
  id: string;
  name: string;
  imageUrl: string;
}

export default function PlanUploader() {
  // Modal State
  const [showModal, setShowModal] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  // Plans List State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "plans")), (snap) => {
      const pData: Plan[] = [];
      snap.forEach(d => pData.push({ id: d.id, ...d.data() } as Plan));
      setPlans(pData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Erro na compressão"));
          }, "image/jpeg", 0.7); // 70% quality JPEG
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    setMessage("");

    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file);

      // Create a storage reference
      const storageRef = ref(storage, `plans/${Date.now()}_${file.name.split('.')[0]}.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(prog);
        },
        (error) => {
          console.error("Upload error:", error);
          setMessage("Erro ao fazer upload da planta.");
          setUploading(false);
        },
        async () => {
          // Upload completed successfully, now we can get the download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save metadata to Firestore
          try {
            await addDoc(collection(db, "plans"), {
              name,
              imageUrl: downloadURL,
              createdAt: serverTimestamp(),
            });
            setMessage("Planta carregada com sucesso!");
            setFile(null);
            setName("");
            
            // Opcional: Reset the file input visually
            const fileInput = document.getElementById('plan-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            
            setTimeout(() => setShowModal(false), 1500);
          } catch (err) {
            console.error(err);
            setMessage("Erro ao guardar na base de dados.");
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (err) {
      console.error("Erro na compressão:", err);
      setMessage("Erro ao processar e comprimir a imagem.");
      setUploading(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Tem a certeza que deseja eliminar a planta "${plan.name}"? As zonas que dependem dela ficarão sem mapa.`)) return;

    try {
       // Delete from Firestore
       await deleteDoc(doc(db, "plans", plan.id));
       // Try to delete from Storage if possible
       try {
         const fileRef = ref(storage, plan.imageUrl);
         await deleteObject(fileRef);
       } catch (storageErr) {
         console.error("Could not delete from storage, mas documento removido.", storageErr);
       }
    } catch (err) {
       console.error(err);
       alert("Erro ao eliminar a planta.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Header & List Section */}
      <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
         
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <Map size={20} color="var(--color-primary)" />
              Plantas Carregadas
            </h3>
            
            <button 
               className="btn btn-primary" 
               onClick={() => setShowModal(true)}
               style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "999px", padding: "0.6rem 1.2rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            >
               <Plus size={18} /> Nova Planta
            </button>
         </div>

        {loading ? (
          <p>A carregar...</p>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-text-secondary)" }}>
            <Map size={48} color="var(--color-border)" style={{ marginBottom: "1rem" }} />
            <p>Ainda não existem plantas carregadas.</p>
            <p style={{ fontSize: "0.875rem" }}>Clique em "Nova Planta" para começar.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {plans.map(p => (
              <div key={p.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-bg)", display: "flex", flexDirection: "column", transition: "transform 0.2s", cursor: "pointer" }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                   onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <div style={{ width: "100%", height: "160px", position: "relative", backgroundColor: "#e5e7eb" }}>
                  <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flex: 1 }}>
                   <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                     {p.name}
                   </span>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                     className="btn btn-secondary" 
                     style={{ padding: "0.4rem", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                     title="Eliminar Planta"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
          <div className="glass animate-fade-in" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px", position: "relative" }}>
            
            <button 
               onClick={() => setShowModal(false)}
               style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
            >
               <X size={20} />
            </button>

            <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 0 }}>
              <UploadCloud size={20} color="var(--color-primary)" />
              Carregar Nova Planta
            </h3>

            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Nome da Planta (ex: Piso 0 - Entrada)
                </label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  Imagem da Planta (JPG, PNG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/jpg"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  required
                  style={{ width: "100%", padding: "0.5rem", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", cursor: "pointer" }}
                />
              </div>

              {uploading && (
                <div style={{ width: "100%", backgroundColor: "var(--color-border)", borderRadius: "999px", height: "8px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "var(--color-primary)", transition: "width 0.2s" }} />
                </div>
              )}

              {message && (
                <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: message.includes("sucesso") ? "var(--color-success)" : "var(--color-danger)" }}>
                  {message}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !file || !name}>
                  {uploading ? `A Carregar... ${progress}%` : "Fazer Upload"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
