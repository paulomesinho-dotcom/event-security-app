import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging, getAdminFirestore } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { vigiaId, message, title } = await req.json();

    if (!vigiaId || !message) {
      return NextResponse.json({ error: "vigiaId e message são obrigatórios." }, { status: 400 });
    }

    // Fetch FCM token from Firestore
    const adminDb = getAdminFirestore();
    const userDoc = await adminDb.collection("users").doc(vigiaId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      return NextResponse.json(
        { error: "Este vigia ainda não activou as notificações push na aplicação.", code: "NO_FCM_TOKEN" },
        { status: 200 } // Not an error — graceful degradation
      );
    }

    // Send FCM push notification
    const adminMessaging = getAdminMessaging();
    await adminMessaging.send({
      token: fcmToken,
      notification: {
        title: title || "Porto 2026 Security",
        body: message,
      },
      data: {
        vigiaId,
        message,
        clickAction: "/dashboard",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "porto2026-security",
          priority: "max",
          sound: "default",
          vibrateTimingsMillis: [0, 250, 250, 250],
          icon: "notification_icon",
          color: "#151F31",
        },
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          requireInteraction: true,
          tag: "porto2026-captain-msg",
          renotify: true,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao enviar FCM:", error);

    // Handle invalid/expired token gracefully
    if (error.code === "messaging/registration-token-not-registered") {
      return NextResponse.json({ error: "Token FCM inválido ou expirado.", code: "INVALID_TOKEN" }, { status: 200 });
    }

    return NextResponse.json({ error: "Erro interno ao enviar notificação." }, { status: 500 });
  }
}
