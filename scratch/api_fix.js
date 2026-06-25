const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/app/api/send-notification-all/route.ts');

const newRouteCode = `import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging, getAdminFirestore } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { message, title, senderName, senderId, target } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "message é obrigatório." }, { status: 400 });
    }

    const adminDb = getAdminFirestore();
    const usersSnapshot = await adminDb.collection("users").get();
    
    const tokens: string[] = [];
    const targetUids: string[] = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      // If target is "captain", only target roles captain/superadmin
      if (target === "captain") {
        if (data.role === "captain" || data.role === "superadmin") {
          targetUids.push(doc.id);
          if (data.fcmToken) tokens.push(data.fcmToken);
        }
      } else {
        // target === "all"
        targetUids.push(doc.id);
        if (data.fcmToken) tokens.push(data.fcmToken);
      }
    });

    // Save notification to Firestore history
    const notificationRef = await adminDb.collection("global_notifications").add({
      senderId: senderId || "unknown",
      senderName: senderName || "Desconhecido",
      message,
      target: target || "all",
      timestamp: new Date().toISOString(),
      readBy: [] // Array of UIDs who have read this
    });

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: true, warning: "Nenhum utilizador com notificações ativas.", code: "NO_FCM_TOKENS" },
        { status: 200 }
      );
    }

    const adminMessaging = getAdminMessaging();
    const finalTitle = title || (senderName ? \`Notificação de \${senderName}\` : "Notificação");
    
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: finalTitle,
        body: message,
      },
      data: {
        message,
        clickAction: "/dashboard",
      },
      webpush: {
        notification: {
          title: finalTitle,
          body: message,
          icon: "/icons/icon-192.png",
        },
        fcmOptions: {
          link: "/dashboard"
        }
      },
    });

    return NextResponse.json({ success: true, successCount: response.successCount, failureCount: response.failureCount, notificationId: notificationRef.id });
  } catch (error: any) {
    console.error("Erro ao enviar FCM:", error);
    return NextResponse.json({ error: "Erro interno ao enviar notificação." }, { status: 500 });
  }
}
`;

fs.writeFileSync(routePath, newRouteCode);
console.log('Updated /api/send-notification-all/route.ts');
