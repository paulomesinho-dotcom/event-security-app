import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const adminDb = getAdminFirestore();

    const uSnap = await adminDb.collection("users").get();
    const users = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const aSnap = await adminDb.collection("assignments").get();
    const assignments = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, users, assignments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
