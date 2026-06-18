"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import styles from "./login.module.css";
import { UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [congregation, setCongregation] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      setError("Por favor, preencha o campo de Email para redefinir a palavra-passe.");
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Email de redefinição enviado! Verifique a sua caixa de entrada.");
      setError("");
    } catch (err: any) {
      setError("Erro ao enviar email de redefinição. Verifique se o email está correto.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });

        // Save extra info in Firestore
        await setDoc(doc(db, "users", user.uid), {
          role: "vigia", // Default role
          name,
          email,
          contact,
          congregation,
          createdAt: new Date().toISOString()
        });
      } else {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError("Email ou password incorretos. Verifique os seus dados ou registe uma nova conta se ainda não o fez.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este email já está registado. Por favor, faça Login.");
      } else {
        setError(err.message || "Ocorreu um erro. Verifique as credenciais.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="/logo.jpg" alt="Porto 2026 Logo" width={80} height={80} style={{ borderRadius: "var(--radius-md)", marginBottom: "1rem", objectFit: "cover" }} />
          <h1 style={{ color: "var(--color-primary)" }}>{isRegistering ? "Criar Conta" : "Bem-vindo"}</h1>
          <p>{isRegistering ? "Registe-se como Vigia para ver os seus turnos." : "Entre na sua conta para aceder ao painel."}</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {successMsg && <div style={{ background: "#dcfce7", color: "#166534", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem", textAlign: "center" }}>{successMsg}</div>}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome Completo</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="João Silva"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Contacto Telefónico</label>
                <input
                  type="tel"
                  className="input"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  placeholder="910000000"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Congregação</label>
                <input
                  type="text"
                  className="input"
                  value={congregation}
                  onChange={(e) => setCongregation(e.target.value)}
                  required
                  placeholder="Ex: Lisboa Central"
                />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemplo@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <label className={styles.label}>Password</label>
               {!isRegistering && (
                  <button type="button" onClick={handleResetPassword} style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
                    Esqueceu-se?
                  </button>
               )}
            </div>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? "Aguarde..." : (isRegistering ? "Registar Conta" : "Entrar")}
          </button>
        </form>

        <div className={styles.toggleText}>
          {isRegistering ? "Já tem conta? " : "Novo por aqui? "}
          <span 
            className={styles.toggleLink} 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Faça Login" : "Registe-se como Vigia"}
          </span>
        </div>
      </div>
    </div>
  );
}
