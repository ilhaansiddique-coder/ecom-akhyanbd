"use client";

import { useEffect, useRef, useCallback } from "react";

// ─── Simple hash (works on HTTP — no crypto.subtle needed) ───
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (((h2 >>> 0) * 4294967296 + (h1 >>> 0)).toString(16)).padStart(16, "0");
}

async function sha256(str: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* fallback below */ }
  // Fallback for HTTP — double simpleHash for longer output
  return simpleHash(str) + simpleHash(str + "salt");
}

// ─── Canvas fingerprint ───
async function getCanvasHash(): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200; canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("BrowserFP!🎭", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("BrowserFP!🎭", 4, 17);
    const data = canvas.toDataURL();
    return await sha256(data);
  } catch { return ""; }
}

// ─── WebGL fingerprint ───
function getWebGLHash(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return gl.getParameter(gl.RENDERER) || "";
    return `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}~${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`;
  } catch { return ""; }
}

// ─── Audio fingerprint ───
async function getAudioHash(): Promise<string> {
  try {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, ctx.currentTime);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-50, ctx.currentTime);
    comp.knee.setValueAtTime(40, ctx.currentTime);
    comp.ratio.setValueAtTime(12, ctx.currentTime);
    comp.attack.setValueAtTime(0, ctx.currentTime);
    comp.release.setValueAtTime(0.25, ctx.currentTime);
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await ctx.startRendering();
    const data = buf.getChannelData(0).slice(4500, 5000);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
    return sum.toFixed(6);
  } catch { return ""; }
}

// ─── Combine into fpHash ───
async function generateFpHash(canvas: string, webgl: string, audio: string): Promise<string> {
  const raw = `${canvas}|${webgl}|${audio}|${navigator.platform || ""}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  const hash = await sha256(raw);
  return hash.slice(0, 32);
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${days * 86400};SameSite=Lax`;
}

export interface FingerprintData {
  fpHash: string;
  canvasHash: string;
  webglHash: string;
  audioHash: string;
  screenResolution: string;
  platform: string;
  timezone: string;
  languages: string;
  cpuCores: number;
  memoryGb: number;
  touchPoints: number;
}

/**
 * Collects browser fingerprint once, stores in cookie, sends to server.
 * Returns getFpHash() to retrieve the current fingerprint.
 */
export function useFingerprint() {
  const fpRef = useRef<string>("");
  const sentRef = useRef(false);

  useEffect(() => {
    // Check existing cookie first
    const existing = getCookie("fpHash");
    if (existing) {
      fpRef.current = existing;
    }

    // Collect and send in background
    if (!sentRef.current) {
      sentRef.current = true;
      (async () => {
        try {
          const [canvasHash, audioHash] = await Promise.all([getCanvasHash(), getAudioHash()]);
          const webglHash = getWebGLHash();
          const fpHash = existing || await generateFpHash(canvasHash, webglHash, audioHash);

          fpRef.current = fpHash;
          setCookie("fpHash", fpHash);

          const data: FingerprintData = {
            fpHash,
            canvasHash,
            webglHash,
            audioHash,
            screenResolution: `${screen.width}x${screen.height}`,
            platform: navigator.platform || "",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages?.join(",") || navigator.language || "",
            cpuCores: navigator.hardwareConcurrency || 0,
            memoryGb: (navigator as any).deviceMemory || 0,
            touchPoints: navigator.maxTouchPoints || 0,
          };

          fetch("/api/v1/fingerprint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            keepalive: true,
          }).catch(() => {});
        } catch { /* silent */ }
      })();
    }
  }, []);

  const getFpHash = useCallback(() => fpRef.current || getCookie("fpHash") || "", []);

  return { getFpHash };
}
