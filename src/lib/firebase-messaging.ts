import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) {
    console.log("Este browser não suporta notificações.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permissão de notificações negada.");
      return null;
    }

    // Register the FCM service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      // Save token to Firestore for this user
      await updateDoc(doc(db, "users", userId), { fcmToken: token });
      console.log("FCM Token guardado:", token);
      return token;
    }
    return null;
  } catch (error) {
    console.error("Erro ao obter FCM token:", error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return () => {};
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (e) {
    console.error("Erro ao registar listener FCM:", e);
    return () => {};
  }
}
