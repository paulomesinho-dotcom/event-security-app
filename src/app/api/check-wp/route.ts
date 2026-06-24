import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const adminDb = getAdminFirestore();
    const wSnap = await adminDb.collection("workplaces").get();
    const workplaces = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const lSnap = await adminDb.collection("abstract_locations").get();
    const locations = lSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const aSnap = await adminDb.collection("assignments").get();
    const assignments = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, workplaces, locations, assignments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
