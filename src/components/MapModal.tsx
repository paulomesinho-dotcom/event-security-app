import { X } from "lucide-react";
import MapViewer from "./MapViewer";

interface MapModalProps {
  data: {
    planImageUrl: string;
    pinX: number;
    pinY: number;
    title?: string;
  } | null;
  onClose: () => void;
}

export default function MapModal({ data, onClose }: MapModalProps) {
  if (!data) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--color-text-primary)" }}>{data.title || "Localização na Planta"}</h3>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.5rem" }}>
          <X size={24} />
        </button>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MapViewer 
          imageUrl={data.planImageUrl} 
          locators={[{ id: "pin", x: data.pinX, y: data.pinY, name: data.title || "Pin" }]} 
        />
      </div>
    </div>
  );
}
