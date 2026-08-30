export function initConfetti() {
  const FLAG = `<svg viewBox="0 0 34 26" xmlns="http://www.w3.org/2000/svg"><rect width="34" height="26" fill="#C8102E"/><rect x="12" width="4" height="26" fill="#fff"/><rect y="11" width="34" height="4" fill="#fff"/></svg>`;

  const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
  ).matches;
  const GRAVITY = 0.2;
  const DRAG = 0.98;

  interface Particle {
    el: HTMLSpanElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    life: number;
    ttl: number;
  }


  function burst(x: number, y: number) {
      const count = 5;
      const pieces: Particle[] = [];

      for (let i = 0; i < count; i++) {
          const el = document.createElement("span");
          el.className = "confetti";
          el.innerHTML = FLAG;
          document.body.appendChild(el);

          const angle = Math.random() * Math.PI * 2; // fly out in any direction
          const speed = 2 + Math.random() * 2;
          pieces.push({
              el,
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 4, // slight upward pop
              rot: Math.random() * 360,
              vr: (Math.random() - 0.5) * 10, // spin speed
              life: 0,
              ttl: 55 + Math.random() * 35, // frames alive (~1–1.5s)
          });
      }

      function frame() {
          let alive = false;
          for (const p of pieces) {
              if (p.life >= p.ttl) {
                  p.el.remove();
                  continue;
              }
              alive = true;
              p.life++;
              p.vx *= DRAG;
              p.vy = p.vy * DRAG + GRAVITY;
              p.x += p.vx;
              p.y += p.vy;
              p.rot += p.vr;
              const fade = 1 - p.life / p.ttl;
              p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
              p.el.style.opacity = String(Math.min(1, fade * 1.6));
          }
          if (alive) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
  }

  const COOLDOWN_MS = 300;
  let lastBurstAt = 0;

  document
      .querySelectorAll<HTMLElement>("[data-confetti]")
      .forEach((host) => {
          host.addEventListener("click", (e) => {
              if (reduceMotion) return;
              const now = Date.now();
              if (now - lastBurstAt < COOLDOWN_MS) return;
              lastBurstAt = now;

              // burst from the actual click target's center so it works
              // whether the button is small or large inside the wrapper
              const target = (e.target as HTMLElement).closest?.("button, a") ?? host;
              const r = target.getBoundingClientRect();
              burst(r.left + r.width / 2, r.top + r.height / 2);
          });
      });
}
