"use client";

import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#22c55e", // green
  "#eab308", // yellow
];

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        velocityX: (Math.random() - 0.5) * 10,
        velocityY: Math.random() * 3 + 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    return newParticles;
  }, []);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      setParticles(createParticles());

      // Clear after animation
      const timeout = setTimeout(() => {
        setParticles([]);
        setIsActive(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [trigger, isActive, createParticles, onComplete]);

  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX,
            y: p.y + p.velocityY,
            rotation: p.rotation + p.rotationSpeed,
            velocityY: p.velocityY + 0.1, // gravity
          }))
          .filter((p) => p.y < window.innerHeight + 50)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles.length]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

// Hook to manage first-time celebration
export function useFirstApprovalCelebration() {
  const [hasApprovedFirst, setHasApprovedFirst] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Check localStorage for first approval
    const hasApproved = localStorage.getItem("linwheel_first_approval");
    setHasApprovedFirst(!!hasApproved);
  }, []);

  const triggerCelebration = useCallback(() => {
    if (!hasApprovedFirst) {
      setShowConfetti(true);
      localStorage.setItem("linwheel_first_approval", "true");
      setHasApprovedFirst(true);
    }
  }, [hasApprovedFirst]);

  const onConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  return { showConfetti, triggerCelebration, onConfettiComplete };
}
