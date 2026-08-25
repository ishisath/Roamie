import { useRef, useState, useEffect } from "react";

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useTilt(max = 10) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const onMove = (e) => {
    if (!ref.current || reduced()) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(18px)`,
    });
  };

  const onLeave = () =>
    setStyle({ transform: "perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)" });

  return { ref, style, onMouseMove: onMove, onMouseLeave: onLeave };
}

export function useParallax() {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

export function usePointer() {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduced()) return;
    const onMove = (e) => {
      setP({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return p;
}