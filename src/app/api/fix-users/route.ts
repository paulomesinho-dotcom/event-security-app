import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const adminDb = getAdminFirestore();

    const wSnap = await adminDb.collection("workplaces").get();
    const existingWorkplaces = wSnap.docs.map(d => d.id);

    const uSnap = await adminDb.collection("users").get();
    
    let countFixed = 0;
    for (const docSnap of uSnap.docs) {
      const uData = docSnap.data();
      if (uData.workplaceId && !existingWorkplaces.includes(uData.workplaceId)) {
        await adminDb.collection("users").doc(docSnap.id).update({
          workplaceId: null,
          teamId: null
        });
        countFixed++;
      }
    }

    return NextResponse.json({ success: true, fixed: countFixed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
