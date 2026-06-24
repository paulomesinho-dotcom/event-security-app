import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { predefinedShifts } from "@/lib/shift-data";

export async function GET() {
  try {
    const adminDb = getAdminFirestore();
    let count = 0;
    
    for (const [localName, shifts] of Object.entries(predefinedShifts)) {
      await adminDb.collection("abstract_locations").add({
        local: localName,
        sublocal: "",
        subsublocal: "",
        captainId: "admin",
        workplaceId: "global",
        customShifts: shifts
      });
      count++;
    }
    return NextResponse.json({ message: `Migrated ${count} locations.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
