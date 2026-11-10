/**
 * Sintetizador acústico de golpe de mazo judicial con Web Audio API.
 * 100% nativo, sin dependencias externas ni descargas de archivos mp3.
 */
export function playGavelStrike() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 1. Primer impacto seco de madera
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.15);

    gain1.gain.setValueAtTime(0.8, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.2);

    // 2. Rebote solemne (double strike)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(160, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

        gain2.gain.setValueAtTime(0.5, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      } catch {
        // Ignorar si el contexto ya se cerró
      }
    }, 110);
  } catch {
    // Si el navegador bloquea audio antes de interacción
  }
}

