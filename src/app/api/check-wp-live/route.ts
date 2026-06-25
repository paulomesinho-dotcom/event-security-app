import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  const snap = await getDocs(collection(db, "workplaces"));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json(data);
}
