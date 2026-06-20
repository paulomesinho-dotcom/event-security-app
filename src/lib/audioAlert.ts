"use client";

let audioCtx: AudioContext | null = null;
let isInitialized = false;
let loopInterval: any = null;

export const initAudio = () => {
  if (isInitialized) return;
  if (typeof window === "undefined") return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Play a completely silent beep to "unlock" the audio context permanently
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0; // Silent
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);

    isInitialized = true;
    console.log("AudioContext unlocked and initialized.");
  } catch (err) {
    console.error("Failed to initialize audio:", err);
  }
};

export const stopAlertBeeps = () => {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("audioAlertStopped"));
  }
};

export const playAlertBeeps = (alertMessage = "Novo Alerta Recebido") => {
  try {
    if (typeof window === "undefined") return;
    if (!audioCtx) {
      initAudio();
    }
    
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (loopInterval) return; // already looping

    const playSoftBeep = () => {
      try {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        // Less intrusive sound: soft sine wave double-beep
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.setValueAtTime(0.4, now + 0.2);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(650, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (err) {}
    };

    playSoftBeep();
    // Repeat every 2.5 seconds
    loopInterval = setInterval(playSoftBeep, 2500);

    window.dispatchEvent(new CustomEvent("audioAlertStarted", { detail: { message: alertMessage } }));
    
  } catch (err) {
    console.error("Failed to play audio alert:", err);
  }
};
