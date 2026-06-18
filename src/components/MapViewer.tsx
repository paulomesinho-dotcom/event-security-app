"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface Locator {
  id: string;
  x: number;
  y: number;
  name: string;
  color?: string; // Optional custom color
  locationId?: string;
}

interface MapViewerProps {
  imageUrl: string;
  locators?: Locator[];
  onAddLocator?: (x: number, y: number) => void;
  onLocatorClick?: (locator: Locator) => void;
  onLocatorDragEnd?: (locatorId: string, x: number, y: number) => void;
  isAddPinMode?: boolean;
}

export default function MapViewer({ imageUrl, locators = [], onAddLocator, onLocatorClick, onLocatorDragEnd, isAddPinMode }: MapViewerProps) {
  const [scale, setScale] = useState(1.0);
  const [natSize, setNatSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use a ref for scale to avoid stale closures in event listeners
  const scaleRef = useRef(1.0);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Drag and Pan state
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  
  // Pin Dragging state
  const [draggingLocator, setDraggingLocator] = useState<{ id: string, x: number, y: number } | null>(null);

  // Pinch Zoom State
  const initialPinchDist = useRef<number | null>(null);
  const initialScale = useRef<number>(1.0);

  // Fit to screen on load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    setNatSize({ w, h });
    
    if (containerRef.current && w > 0) {
      const containerWidth = containerRef.current.clientWidth;
      setScale(containerWidth / w);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 1) return;
    isDragging.current = true;
    setDragMoved(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    if ('touches' in e && e.touches.length > 1) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - lastPos.current.x;
    const dy = clientY - lastPos.current.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setDragMoved(true);
    }
    
    if (draggingLocator) {
      setDraggingLocator(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          x: prev.x + dx / scaleRef.current,
          y: prev.y + dy / scaleRef.current
        };
      });
    } else {
      containerRef.current.scrollLeft -= dx;
      containerRef.current.scrollTop -= dy;
    }

    lastPos.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (draggingLocator) {
      if (dragMoved && onLocatorDragEnd) {
        onLocatorDragEnd(draggingLocator.id, draggingLocator.x, draggingLocator.y);
      } else if (!dragMoved && onLocatorClick) {
        const loc = locators.find(l => l.id === draggingLocator.id);
        if (loc) onLocatorClick(loc);
      }
      setDraggingLocator(null);
      return;
    }

    if (!dragMoved && onAddLocator && 'clientX' in e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      onAddLocator(x, y);
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (draggingLocator && dragMoved && onLocatorDragEnd) {
      onLocatorDragEnd(draggingLocator.id, draggingLocator.x, draggingLocator.y);
      setDraggingLocator(null);
    }
  };

  // Pinch Zoom Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isDragging.current = false; // Disable pan
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialPinchDist.current = dist;
      initialScale.current = scaleRef.current;
    } else {
      handleMouseDown(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current && containerRef.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / initialPinchDist.current;
      const newScale = Math.max(0.1, Math.min(initialScale.current * ratio, 5));
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyZoom(newScale, midX, midY);
    } else {
      handleMouseMove(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    initialPinchDist.current = null;
    handleMouseUp(e);
  };

  // Generic Zoom Applicator that keeps the center point stationary
  const applyZoom = (newScale: number, clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const imageX = mouseX + el.scrollLeft;
    const imageY = mouseY + el.scrollTop;

    const unscaledX = imageX / scaleRef.current;
    const unscaledY = imageY / scaleRef.current;

    setScale(newScale);

    requestAnimationFrame(() => {
      if (containerRef.current) {
         containerRef.current.scrollLeft = unscaledX * newScale - mouseX;
         containerRef.current.scrollTop = unscaledY * newScale - mouseY;
      }
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY !== 0) {
      const zoomFactor = 0.05;
      const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
      const newScale = Math.max(0.1, Math.min(scaleRef.current + delta, 5));
      applyZoom(newScale, e.clientX, e.clientY);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => {
       e.preventDefault();
    };
    const handleTouch = (e: TouchEvent) => {
       if (e.touches.length > 1) e.preventDefault();
    }
    el.addEventListener("wheel", preventScroll, { passive: false });
    el.addEventListener("touchmove", handleTouch, { passive: false });
    return () => {
      el.removeEventListener("wheel", preventScroll);
      el.removeEventListener("touchmove", handleTouch);
    }
  }, []);

  return (
    <div style={{ position: "relative", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#f3f4f6" }}>
      
      {/* Zoom Controls */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, display: "flex", gap: "0.5rem" }}>
         <button onClick={() => applyZoom(Math.max(0.1, scale - 0.2), window.innerWidth/2, window.innerHeight/2)} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", boxShadow: "var(--shadow-md)" }}>-</button>
         <button onClick={() => applyZoom(Math.min(scale + 0.2, 5), window.innerWidth/2, window.innerHeight/2)} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", boxShadow: "var(--shadow-md)" }}>+</button>
      </div>

      <div 
         ref={containerRef}
         onWheel={handleWheel}
         style={{ 
           overflow: "hidden", 
           maxHeight: "70vh", 
           width: "100%", 
           background: "#e5e7eb",
           cursor: isAddPinMode ? "crosshair" : isDragging.current ? "grabbing" : "grab",
           touchAction: "none" // Prevents browser panning
         }}
      >
        <div 
          style={{ 
            position: "relative", 
            width: natSize.w ? natSize.w * scale : "100%", 
            minHeight: "200px",
            margin: "0 auto"
          }} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Image */}
          <img 
            src={imageUrl} 
            alt="Planta" 
            onLoad={handleImageLoad}
            draggable={false}
            style={{ 
              width: "100%", 
              height: "auto",
              opacity: 0.6,
              display: "block",
              pointerEvents: "none",
              userSelect: "none"
            }} 
          />

          {/* Render Locators */}
          {locators.map((loc) => {
            const locColor = loc.color || "var(--color-danger)";
            const isThisDragging = draggingLocator?.id === loc.id;
            const displayX = isThisDragging ? draggingLocator.x : loc.x;
            const displayY = isThisDragging ? draggingLocator.y : loc.y;
            
            return (
              <div 
                key={loc.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (!onLocatorDragEnd) return;
                  setDraggingLocator({ id: loc.id, x: loc.x, y: loc.y });
                  isDragging.current = true;
                  setDragMoved(false);
                  
                  const clientX = e.clientX;
                  const clientY = e.clientY;
                  lastPos.current = { x: clientX, y: clientY };
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (!onLocatorDragEnd || e.touches.length > 1) return;
                  setDraggingLocator({ id: loc.id, x: loc.x, y: loc.y });
                  isDragging.current = true;
                  setDragMoved(false);
                  
                  const clientX = e.touches[0].clientX;
                  const clientY = e.touches[0].clientY;
                  lastPos.current = { x: clientX, y: clientY };
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isThisDragging && onLocatorClick) onLocatorClick(loc);
                }}
                style={{
                  position: "absolute",
                  left: displayX * scale,
                  top: displayY * scale,
                  transform: "translate(-50%, -100%)",
                  cursor: isThisDragging ? "grabbing" : (onLocatorDragEnd ? "grab" : "pointer"),
                  zIndex: isThisDragging ? 100 : 5
                }}
                title={loc.name}
              >
                {/* Pin Icon with dynamic color */}
                <svg width="32" height="48" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37258 18.6274 0 12 0ZM12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16Z" fill={locColor}/>
                </svg>
                <div style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-surface)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: locColor,
                  boxShadow: "var(--shadow-md)",
                  whiteSpace: "nowrap",
                  border: `2px solid ${locColor}`
                }}>
                  {loc.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
