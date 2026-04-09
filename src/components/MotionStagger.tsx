"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface MotionStaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function MotionStaggerContainer({ children, className, staggerDelay = 0.1 }: MotionStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const items = container.querySelectorAll<HTMLElement>(".stagger-item");
          items.forEach((item, i) => {
            item.style.transitionDelay = `${i * staggerDelay}s`;
            item.classList.add("fade-in-visible");
          });
          observer.unobserve(container);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [staggerDelay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function MotionStaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`stagger-item fade-in fade-in-up ${className || ""}`}>
      {children}
    </div>
  );
}
