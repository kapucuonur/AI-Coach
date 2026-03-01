import { useRef, useEffect } from 'react';

/**
 * HeroCanvas — draws animated sport emoji silhouettes on a canvas
 * that fills the hero banner. Runs its own RAF loop; handles resize.
 */
export function HeroCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const sports = [
            { emoji: '⛷️', topFrac: 0.10, speed: 2.8, label: 'XC SKI' },
            { emoji: '🚴', topFrac: 0.28, speed: 2.2, label: 'CYCLING' },
            { emoji: '🏋️', topFrac: 0.46, speed: 1.9, label: 'STRENGTH' },
            { emoji: '🏃', topFrac: 0.64, speed: 1.6, label: 'RUNNING' },
            { emoji: '🏊', topFrac: 0.82, speed: 1.1, label: 'SWIMMING' },
        ];

        let w = 0;
        let h = 0;
        let positions = [];
        let raf;
        let initialised = false;

        const init = (newW, newH) => {
            w = newW;
            h = newH;
            canvas.width = w;
            canvas.height = h;
            if (!initialised) {
                // Stagger entry so icons appear one-by-one from the right
                positions = sports.map((_, i) => w + 80 + i * (w / sports.length));
                initialised = true;
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);

            const emojiSize = Math.max(24, Math.floor(h * 0.20));
            const labelSize = Math.max(8, Math.floor(h * 0.055));
            ctx.textBaseline = 'middle';

            sports.forEach((s, i) => {
                positions[i] -= s.speed;
                if (positions[i] < -120) {
                    positions[i] = w + 80 + Math.random() * 120;
                }

                const x = positions[i];
                const y = s.topFrac * h;

                // Fade in/out near the edges
                const fadeIn = Math.min(1, x / 120);
                const fadeOut = Math.min(1, (w + 60 - x) / 120);
                const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
                if (alpha <= 0) return;

                ctx.save();
                ctx.globalAlpha = alpha;

                // Glow behind icon
                ctx.shadowColor = 'rgba(100,180,255,0.6)';
                ctx.shadowBlur = 20;

                // Emoji
                ctx.font = `${emojiSize}px sans-serif`;
                ctx.fillText(s.emoji, x, y);

                // Label below
                ctx.shadowBlur = 0;
                ctx.globalAlpha = alpha * 0.55;
                ctx.font = `800 ${labelSize}px Inter, sans-serif`;
                ctx.fillStyle = '#a0c4ff';
                ctx.letterSpacing = '2px';
                ctx.textAlign = 'center';
                ctx.fillText(s.label, x + emojiSize / 2, y + emojiSize / 2 + labelSize * 0.9);
                ctx.textAlign = 'left';

                ctx.restore();
            });

            raf = requestAnimationFrame(draw);
        };

        // ResizeObserver so we always have correct dimensions
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect && rect.width > 0 && rect.height > 0) {
                init(rect.width, rect.height);
            }
        });
        ro.observe(canvas);

        // Kick off immediately if already sized
        const { offsetWidth: ow, offsetHeight: oh } = canvas;
        if (ow > 0 && oh > 0) init(ow, oh);

        raf = requestAnimationFrame(draw);

        return () => {
            ro.disconnect();
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 11,
                pointerEvents: 'none',
            }}
        />
    );
}
