"use client";

import { useRef, useCallback, useEffect } from "react";

export interface BehavioralData {
  fillDurationMs: number;
  mouseMovements: number;
  pasteDetected: boolean;
  honeypotTriggered: boolean;
  tabSwitches: number;
}

/**
 * Tracks user behavior on a form to detect bots/spammers.
 * Call attachToForm(formRef) to start tracking.
 * Call getSignals() when submitting to get the data.
 */
export function useBehavioralTracker() {
  const firstFocusTime = useRef<number | null>(null);
  const mouseCount = useRef(0);
  const pasteDetected = useRef(false);
  const honeypotValue = useRef("");
  const tabSwitches = useRef(0);
  const listenersAttached = useRef(false);

  // Track page visibility changes (tab switches)
  useEffect(() => {
    const handler = () => {
      if (document.hidden) tabSwitches.current++;
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const attachToForm = useCallback((formEl: HTMLElement | null) => {
    if (!formEl || listenersAttached.current) return;
    listenersAttached.current = true;

    // Track first focus
    const focusHandler = () => {
      if (!firstFocusTime.current) firstFocusTime.current = Date.now();
    };

    // Track mouse movements (throttled)
    let lastMouse = 0;
    const mouseHandler = () => {
      const now = Date.now();
      if (now - lastMouse > 50) {
        mouseCount.current++;
        lastMouse = now;
      }
    };

    // Track paste events
    const pasteHandler = () => { pasteDetected.current = true; };

    formEl.addEventListener("focusin", focusHandler);
    formEl.addEventListener("mousemove", mouseHandler);
    formEl.addEventListener("paste", pasteHandler);
  }, []);

  const setHoneypotValue = useCallback((val: string) => {
    honeypotValue.current = val;
  }, []);

  const getSignals = useCallback((): BehavioralData => {
    const now = Date.now();
    return {
      fillDurationMs: firstFocusTime.current ? now - firstFocusTime.current : 0,
      mouseMovements: mouseCount.current,
      pasteDetected: pasteDetected.current,
      honeypotTriggered: honeypotValue.current.length > 0,
      tabSwitches: tabSwitches.current,
    };
  }, []);

  return { attachToForm, setHoneypotValue, getSignals };
}
