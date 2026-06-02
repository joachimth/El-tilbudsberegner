import { useEffect, useRef, useCallback } from "react";
import type { Offer } from "@shared/schema";

const AUTOSAVE_KEY = "el-tilbudsberegner-kladde";
const AUTOSAVE_DELAY_MS = 1500; // Gem 1,5 sek efter sidst ændring

export interface AutosaveSlot {
  offer: Offer;
  savedAt: string; // ISO string
}

export function saveKladde(offer: Offer): void {
  try {
    const slot: AutosaveSlot = { offer, savedAt: new Date().toISOString() };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(slot));
  } catch {
    // localStorage kan fejle i private mode eller ved fuldt lager - ignorer stille
  }
}

export function loadKladde(): AutosaveSlot | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutosaveSlot;
  } catch {
    return null;
  }
}

export function clearKladde(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {}
}

/**
 * Debounced auto-save til localStorage.
 * Gemmer offer 1,5 sek efter sidst ændring.
 */
export function useAutosave(offer: Offer): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(() => {
    saveKladde(offer);
  }, [offer]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save]);
}
