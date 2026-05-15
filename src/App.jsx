import { useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  BrainCircuit,
  Cross,
  Cpu,
  HeartPulse,
  Network,
  ScanLine,
  Waves,
} from "lucide-react";

import mriTunnelVideo from "../Animate_provided_medical_images_202605141304.mp4";
import skullScanVideo from "../Animate_provided_medical_images_202605141305.mp4";

gsap.registerPlugin(ScrollTrigger);

const floatingIcons = [
  { Icon: BrainCircuit, className: "left-[7%] top-[19%]", depth: 26 },
  { Icon: ScanLine, className: "right-[12%] top-[18%]", depth: -18 },
  { Icon: Activity, className: "left-[16%] bottom-[18%]", depth: 32 },
  { Icon: Cpu, className: "right-[19%] bottom-[23%]", depth: -28 },
  { Icon: HeartPulse, className: "left-[47%] top-[13%]", depth: 14 },
  { Icon: Cross, className: "right-[7%] top-[52%]", depth: 20 },
  { Icon: Network, className: "left-[5%] top-[58%]", depth: -22 },
  { Icon: Waves, className: "right-[42%] bottom-[12%]", depth: 18 },
];

// Videos autoplay + loop — opacity cross-fade is handled by Framer Motion scroll spring.
// This is lag-free: no currentTime scrubbing, no seek operations.
function useAutplayVideos(mriRef, skullRef) {
  useEffect(() => {
    [mriRef.current, skullRef.current].forEach((v) => {
      if (!v) return;
      v.muted       = true;
      v.playsInline = true;
      v.loop        = true;
      v.setAttribute("webkit-playsinline", "true");
      v.play().catch(() => {}); // silently handle autoplay block
    });
  }, [mriRef, skullRef]);
}

function App() {
  const mriRef = useRef(null);
  const skullRef = useRef(null);
  const stageRef = useRef(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.2 });
  const skullOpacity = useTransform(smoothScroll, [0.62, 0.78, 1], [0, 0.34, 0.92]);
  const mriOpacity = useTransform(smoothScroll, [0, 0.68, 0.88, 1], [1, 1, 0.42, 0.12]);
  const hudIntensity = useTransform(smoothScroll, [0, 0.65, 1], [0.42, 0.58, 1]);
  const heroLift = useTransform(smoothScroll, [0, 0.35], [0, -95]);

  useAutplayVideos(mriRef, skullRef);

  useEffect(() => {
    const dot  = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");

    const DOT_LERP    = 0.18;   // dot snappiness  (higher = faster)
    const RING_LERP   = 0.08;   // ring lag        (lower  = more trail)
    const PTR_LERP    = 0.06;   // parallax smoothing
    const HALF_DOT    = 3.5;    // half of 7px dot
    const HALF_RING   = 19;     // half of 38px ring

    let mouseX = -200, mouseY = -200;
    let dotX   = -200, dotY   = -200;
    let ringX  = -200, ringY  = -200;
    let ptrX   = 0,    ptrY   = 0;
    let smoothPtrX = 0, smoothPtrY = 0;
    let raf;

    const lerp = (a, b, t) => a + (b - a) * t;

    const onPointerMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      ptrX = (e.clientX / window.innerWidth  - 0.5) * 2;
      ptrY = (e.clientY / window.innerHeight - 0.5) * 2;
      cursorRef.current = { x: ptrX, y: ptrY };
    };

    const onPointerEnterInteractive = () => ring?.classList.add("cursor-hover");
    const onPointerLeaveInteractive = () => ring?.classList.remove("cursor-hover");

    const interactiveSelector = "a, button, [role='button'], label, input, textarea, select";
    const addHoverListeners = () => {
      document.querySelectorAll(interactiveSelector).forEach((el) => {
        el.addEventListener("pointerenter", onPointerEnterInteractive);
        el.addEventListener("pointerleave", onPointerLeaveInteractive);
      });
    };
    addHoverListeners();

    const tick = () => {
      dotX  = lerp(dotX,  mouseX, DOT_LERP);
      dotY  = lerp(dotY,  mouseY, DOT_LERP);
      ringX = lerp(ringX, mouseX, RING_LERP);
      ringY = lerp(ringY, mouseY, RING_LERP);
      smoothPtrX = lerp(smoothPtrX, ptrX, PTR_LERP);
      smoothPtrY = lerp(smoothPtrY, ptrY, PTR_LERP);

      if (dot)  dot.style.transform  = `translate(${dotX  - HALF_DOT}px, ${dotY  - HALF_DOT}px)`;
      if (ring) ring.style.transform = `translate(${ringX - HALF_RING}px, ${ringY - HALF_RING}px)`;

      document.documentElement.style.setProperty("--pointer-x", smoothPtrX.toFixed(5));
      document.documentElement.style.setProperty("--pointer-y", smoothPtrY.toFixed(5));

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointerMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
      document.querySelectorAll(interactiveSelector).forEach((el) => {
        el.removeEventListener("pointerenter", onPointerEnterInteractive);
        el.removeEventListener("pointerleave", onPointerLeaveInteractive);
      });
    };
  }, []);

  useEffect(() => {
    if (!stageRef.current) return undefined;

    const context = gsap.context(() => {
      gsap.to(".hero-copy", {
        yPercent: -16,
        opacity: 0.35,
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top top",
          end: "25% top",
          scrub: 0.6,
        },
      });

      gsap.fromTo(
        ".problem-card",
        { y: 80, opacity: 0, filter: "blur(16px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          scrollTrigger: {
            trigger: ".problem-section",
            start: "top 72%",
            end: "top 40%",
            scrub: 0.5,
          },
        },
      );

      gsap.fromTo(
        ".completion-panel",
        { scale: 0.92, opacity: 0, y: 80 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: ".ending-section",
            start: "top 68%",
            end: "top 30%",
            scrub: 0.5,
          },
        },
      );
    }, stageRef);

    return () => context.revert();
  }, []);

  const neuralDots = useMemo(
    () => Array.from({ length: 34 }, (_, index) => ({ id: index, x: (index * 29) % 100, y: (index * 47) % 100 })),
    [],
  );

  return (
    <>
      {/* ── Smooth custom cursor ── */}
      <div className="cursor-dot" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />

      <main ref={stageRef} className="story-shell min-h-[190vh] bg-medical-ink text-white">
      <section className="fixed inset-0 overflow-hidden">
        <motion.video
          ref={mriRef}
          className="video-layer absolute inset-0 h-full w-full scale-[1.04] object-cover brightness-[1.08] contrast-[1.24] saturate-[1.14]"
          src={mriTunnelVideo}
          muted
          autoPlay
          loop
          playsInline
          webkit-playsinline="true"
          preload="auto"
          style={{ opacity: mriOpacity }}
          aria-label="MRI scanner tunnel background"
        />
        <motion.video
          ref={skullRef}
          className="video-layer absolute inset-0 h-full w-full scale-[1.05] object-cover brightness-[0.92] contrast-[1.24] saturate-[1.14]"
          src={skullScanVideo}
          muted
          autoPlay
          loop
          playsInline
          webkit-playsinline="true"
          preload="auto"
          style={{ opacity: skullOpacity }}
          aria-label="Skull scan ending transition"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_66%_42%,rgba(92,236,255,0.14),transparent_34%),linear-gradient(90deg,rgba(1,5,12,0.68)_0%,rgba(3,8,16,0.32)_45%,rgba(1,4,9,0.48)_100%)]" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scan-grid opacity-55" />
        <motion.div className="absolute inset-0 hud-layer" style={{ opacity: hudIntensity }}>
          <div className="diagnostic-ring left-[63%] top-[33%]" />
          <div className="diagnostic-ring diagnostic-ring-sm right-[18%] bottom-[18%]" />
          <div className="pulse-target left-[13%] bottom-[28%]" />
          <svg className="ecg-wave" viewBox="0 0 760 120" aria-hidden="true">
            <path d="M0 72 H95 L118 72 L137 22 L156 102 L184 72 H298 L326 72 L346 40 L361 88 L381 72 H520 L540 72 L560 30 L585 96 L610 72 H760" />
          </svg>
          <div className="data-stream stream-a" />
          <div className="data-stream stream-b" />
          <div className="particle-field">
            {neuralDots.map((dot) => (
              <span key={dot.id} style={{ left: `${dot.x}%`, top: `${dot.y}%`, animationDelay: `${dot.id * 0.18}s` }} />
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative flex min-h-[100vh] items-center overflow-hidden px-5 py-16 sm:px-8 lg:px-16">
        <motion.div className="hero-copy z-10 max-w-5xl pt-16" style={{ y: heroLift }}>
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-cyan-200/20 bg-cyan-100/[0.045] px-4 py-2 text-xs font-medium uppercase tracking-[0.36em] text-cyan-100/85 shadow-glow backdrop-blur-2xl">
            <span className="h-2 w-2 rounded-full bg-medical-cyan shadow-[0_0_18px_rgba(92,236,255,0.95)]" />
            AI Medical Scan Website
          </div>
          <h1 className="max-w-4xl text-balance font-display text-[clamp(3.2rem,9vw,8.8rem)] font-extralight leading-[0.92] tracking-normal text-white drop-shadow-[0_0_34px_rgba(160,243,255,0.16)]">
            Medical Scan Analysis Website
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-light leading-8 text-slate-100/78 sm:text-xl">
            Upload X-ray, MRI, or CT images, run AI-assisted analysis, review confidence scores, and download a structured diagnostic report from one dashboard.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a className="glass-button" href="#problem">About This Website</a>
            <a className="glass-button glass-button-secondary" href="#scan-analysis">How It Works</a>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {floatingIcons.map(({ Icon, className, depth }, index) => (
            <motion.div
              key={index}
              className={`floating-icon ${className}`}
              animate={{ y: [0, -14, 0], rotate: [0, index % 2 ? 3 : -3, 0] }}
              transition={{ duration: 7 + index * 0.55, repeat: Infinity, ease: "easeInOut" }}
              style={{
                transform: `translate3d(calc(var(--pointer-x) * ${depth}px), calc(var(--pointer-y) * ${depth}px), 0)`,
              }}
            >
              <Icon size={30} strokeWidth={1.35} />
            </motion.div>
          ))}
        </div>
      </section>

      <section id="problem" className="problem-section relative z-10 flex min-h-[50vh] items-center justify-end px-5 py-12 sm:px-8 lg:px-16">
        <div className="problem-card glass-card w-full max-w-2xl p-6 sm:p-9 lg:p-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.32em] text-cyan-100/70">Website Overview</p>
              <h2 className="text-balance text-3xl font-light leading-tight text-white sm:text-5xl">
                One platform for X-ray, MRI and CT scan review
              </h2>
            </div>
            <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-cyan-100/24 bg-cyan-100/[0.045] shadow-glow backdrop-blur-2xl sm:flex">
              <ScanLine className="text-cyan-100" size={29} strokeWidth={1.3} />
            </div>
          </div>
          <p className="text-base font-light leading-8 text-slate-100/78 sm:text-lg">
            This website lets users sign in, upload a medical scan, choose the scan type, and receive an AI-generated result with detected modality, possible finding, confidence, severity, processing notes, detailed guidance, and a downloadable PDF report.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Upload Scan", "AI Result", "PDF Report"].map((item) => (
              <div key={item} className="metric-tile">
                <span />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="scan-analysis" className="relative z-10 flex min-h-[55vh] items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[0.84fr_1.16fr]">
          <div className="glass-card p-6 sm:p-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.32em] text-cyan-100/70">Dashboard Workflow</p>
            <h2 className="text-3xl font-light leading-tight sm:text-5xl">From uploaded image to clear AI report in seconds.</h2>
          </div>
          <div className="analysis-console">
            <div className="console-header">
              <span />
              <span />
              <span />
            </div>
            <div className="console-body">
              <div className="neural-map" />
              <div className="confidence-line">
                <span>Supported scan types</span>
                <strong>3</strong>
              </div>
              <div className="confidence-line">
                <span>Output sections</span>
                <strong>Report</strong>
              </div>
              <div className="confidence-line">
                <span>Backend status</span>
                <strong>Live</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ending-section relative z-10 flex min-h-[45vh] items-end justify-center px-5 pb-10 pt-12 sm:px-8 lg:px-16">
        <div className="completion-panel glass-card max-w-4xl p-7 text-center sm:p-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.36em] text-cyan-100/75">Final Output</p>
          <h2 className="text-balance text-4xl font-extralight leading-tight sm:text-6xl">
            Upload, analyze, review and download the report.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-light leading-8 text-slate-100/75 sm:text-lg">
            The website shows the detected scan type, model confidence, severity level, AI finding, detailed notes, precautions, recommended pathway, and follow-up guidance for presentation-ready review.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              id="start-analysis-btn"
              className="glass-button px-8"
              to="/login"
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-medical-cyan shadow-[0_0_14px_rgba(92,236,255,0.95)]" />
              Start Your Analysis
            </Link>
            <a className="glass-button glass-button-secondary px-8" href="#problem">
              Website Details
            </a>
          </div>
        </div>
      </section>

      </main>
    </>
  );
}

export default App;
