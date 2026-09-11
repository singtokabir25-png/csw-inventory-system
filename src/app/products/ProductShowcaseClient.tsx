"use client";

import { useEffect, useRef } from "react";

/**
 * Cast & Render — scroll-scrubbed video showcase.
 *
 * ทั้งหน้าไม่ได้เลื่อนคอนเทนต์จริงๆ — .track เป็นตัวเดียวที่ให้ความสูงหน้า
 * แล้วใช้ scroll position มา scrub เฟรมวิดีโอพื้นหลังแบบ fixed เต็มจอ พร้อม
 * cross-fade ข้อความ 3 แผงทับด้านบน
 *
 * เนื้อหา/วิดีโอตอนนี้เป็น placeholder ของ "Cast & Render" (สตูดิโอ 3D สมมติ)
 * ตามที่ตกลงไว้ — เปลี่ยน VIDEO_URL และข้อความใน PANEL COPY ทีหลังได้เลย
 */
export default function ProductShowcaseClient() {
  const clipRef = useRef<HTMLVideoElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootBarRef = useRef<HTMLElement>(null);
  const bootPctRef = useRef<HTMLParagraphElement>(null);
  const meterRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const clip = clipRef.current;
    const boot = bootRef.current;
    const bootBar = bootBarRef.current;
    const bootPct = bootPctRef.current;
    const meter = meterRef.current;
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    if (!clip || !boot || !bootBar || !bootPct || !meter) return;

    // 1920x1080, 10.04s, 241 frames, all-intra — ทุกเฟรมเป็น keyframe ทำให้ scrub
    // ไปเฟรมไหนก็ได้ทันทีโดยไม่ต้อง decode ย้อนจาก keyframe ก่อนหน้า
    const VIDEO_URL =
      "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/45567745-d826-44a2-a5ce-7ef670944e60.mp4";

    // แต่ละแผงมีช่วง scroll ของตัวเอง [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]
    // ในสเกล 0..1 ของทั้งหน้า ช่วงว่างระหว่าง fadeOutEnd ของแผงหนึ่งกับ fadeInStart ของ
    // แผงถัดไปคือโซนที่ตั้งใจเว้นไว้ให้เห็นแต่วิดีโอ ไม่ให้สองแผงอ่านพร้อมกัน
    const CUES: [number, number, number, number][] = [
      [0.0, 0.0, 0.15, 0.23],
      [0.35, 0.43, 0.57, 0.65],
      [0.77, 0.85, 1.1, 1.2],
    ];
    const DRIFT = 22; // px ระยะ counter-scroll ต่อแผง

    const clampV = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const ramp = (p: number, a: number, b: number) => {
      if (b <= a) return p >= b ? 1 : 0;
      return smooth(clampV((p - a) / (b - a), 0, 1));
    };

    let progress = 0;
    let seekTo = 0;
    let seekAt = 0;
    let duration = 0;
    let ready = false;
    let started = false;
    let attached = false;
    let rafId = 0;

    function readScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress = max > 0 ? clampV(window.pageYOffset / max, 0, 1) : 0;
      if (duration) seekTo = progress * duration;
    }

    function paint() {
      if (meter) meter.style.transform = "scaleX(" + progress + ")";
      panels.forEach((el, i) => {
        const c = CUES[i];
        const enter = ramp(progress, c[0], c[1]);
        const leave = ramp(progress, c[2], c[3]);
        const o = enter * (1 - leave);
        const y = (1 - enter) * DRIFT - leave * DRIFT;
        el.style.opacity = String(o);
        el.style.transform = "translate3d(0," + y + "px,0)";
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
      });
    }

    function frame() {
      if (ready && duration && clip) {
        const gap = seekTo - seekAt;
        if (Math.abs(gap) > 0.0008) {
          // ปัจจัยการ ease นี้ห้ามเปลี่ยน — คือสิ่งที่ทำให้การ scrub ลื่นแทนที่จะกระตุก
          seekAt += gap * 0.115;
          if (clip.readyState >= 2 && !clip.seeking) {
            try {
              clip.currentTime = seekAt;
            } catch {
              /* ignore */
            }
          }
        }
      }
      paint();
      rafId = requestAnimationFrame(frame);
    }

    function setProgress(f: number) {
      if (bootBar) bootBar.style.transform = "scaleX(" + f + ")";
      if (bootPct) bootPct.textContent = "LOADING " + Math.round(f * 100) + "%";
    }

    function start() {
      if (started) return;
      started = true;
      ready = true;
      boot?.classList.add("done");
      readScroll();
      seekAt = seekTo;
    }

    function attach(src: string) {
      if (attached || !clip) return;
      attached = true;

      clip.addEventListener("loadedmetadata", () => {
        duration = clip.duration || 0;
        clip.pause();
        readScroll();
        seekAt = seekTo;
        try {
          clip.currentTime = seekAt;
        } catch {
          /* ignore */
        }
      });
      clip.addEventListener("loadeddata", start);
      clip.addEventListener("canplaythrough", start);
      clip.addEventListener("error", start);

      clip.src = src;
      clip.load();
      setTimeout(start, 12000); // กันไม่ให้ decode ค้างแล้วหน้าเว็บติดอยู่หลัง preloader ตลอดไป
    }

    function preload() {
      const canAbort = typeof AbortController !== "undefined";
      const controller = canAbort ? new AbortController() : null;

      const bail = setTimeout(() => {
        if (!attached) {
          controller?.abort();
          setProgress(1);
          attach(VIDEO_URL);
        }
      }, 15000);

      fetch(VIDEO_URL, controller ? { signal: controller.signal } : undefined)
        .then((res) => {
          if (!res.ok || !res.body) throw new Error("bad response");
          const total = Number(res.headers.get("content-length")) || 0;
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let got = 0;

          function pump(): Promise<Blob> {
            return reader.read().then(({ done, value }) => {
              if (done) return new Blob(chunks, { type: "video/mp4" });
              chunks.push(value);
              got += value.length;
              setProgress(total ? got / total : Math.min(got / 11e6, 0.95));
              return pump();
            });
          }
          return pump();
        })
        .then((blob) => {
          clearTimeout(bail);
          setProgress(1);
          attach(URL.createObjectURL(blob));
        })
        .catch(() => {
          // ครอบคลุมทั้ง CORS fail, abort, และออฟไลน์ — ตกลงไปสตรีมจาก URL ตรงแทน
          clearTimeout(bail);
          setProgress(1);
          attach(VIDEO_URL);
        });
    }

    // iOS จะไม่วาดเฟรมจากวิดีโอที่ไม่เคย play เลย เลย "จิ้ม" ให้เล่นแวบเดียวแล้ว pause
    // ทันทีตั้งแต่ interaction แรกของผู้ใช้
    function unlock() {
      const p = clip?.play();
      if (p && typeof p.then === "function") {
        p.then(() => clip?.pause()).catch(() => {});
      } else {
        clip?.pause();
      }
    }
    const unlockEvents: (keyof WindowEventMap)[] = [
      "touchstart",
      "pointerdown",
      "wheel",
      "keydown",
    ];
    unlockEvents.forEach((ev) =>
      window.addEventListener(ev, unlock, { once: true, passive: true })
    );

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll);

    readScroll();
    paint();
    preload();
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock));
    };
  }, []);

  return (
    <>
      <div className="boot" id="boot" ref={bootRef}>
        <div className="bar">
          <i id="bootBar" ref={bootBarRef as any} />
        </div>
        <p id="bootPct" ref={bootPctRef}>
          LOADING 0%
        </p>
      </div>

      <div className="stage">
        <video
          id="clip"
          ref={clipRef}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
        />
        <div className="veil" />
        <div className="grain" />
      </div>

      <i className="meter" id="meter" ref={meterRef as any} />

      <header className="chrome">
        <div className="mark">
          <span className="mark-star" aria-hidden="true">
            &#10037;
          </span>
          &nbsp;Cast &amp; Render
        </div>
        <nav className="nav">
          <a href="#board">Works</a>
          <a href="#visit">About</a>
          <a className="pill" href="#order">
            Start a brief
          </a>
        </nav>
      </header>

      <main className="panels">
        <section
          className="panel"
          data-panel
          ref={(el) => {
            panelRefs.current[0] = el;
          }}
        >
          <div className="eyebrow">
            Objects studio <span>&middot;</span> No. 112 Render Lane
          </div>
          <h1>
            Built at four.
            <br />
            Out by seven.
          </h1>
          <p className="sub">
            Six kinds of mesh, one render farm, and a queue that starts before the sun does.
          </p>
          <div className="cta">
            <a className="pill" href="#board">
              View the reel
            </a>
          </div>
        </section>

        <section
          className="panel"
          data-panel
          ref={(el) => {
            panelRefs.current[1] = el;
          }}
        >
          <div className="eyebrow">Across the studio</div>
          <h1>Flat, never bent.</h1>
          <p className="sub">
            The mesh should still be clean when it reaches the viewport. We export to order, never before.
          </p>
          <div className="cta">
            <a className="pill" href="#visit">
              Tour our space
            </a>
          </div>
        </section>

        <section
          className="panel"
          data-panel
          ref={(el) => {
            panelRefs.current[2] = el;
          }}
        >
          <div className="eyebrow">The surface</div>
          <h1>
            Smooth enough to
            <br />
            hold a light pass.
          </h1>
          <p className="sub">
            Custom surface shaders whipped every morning, spread to the edge and weighed by the quarter pound.
          </p>
          <div className="cta">
            <a className="pill" href="#order">
              Start a brief
            </a>
          </div>
        </section>
      </main>

      <footer className="foot">112 Render Lane &nbsp;&middot;&nbsp; Tue–Sun, 9am till sold out</footer>

      <div className="track" />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap");

        :root {
          --fg: #0d0c0b;
          --fg-soft: rgba(13, 12, 11, 0.64);
          --fg-faint: rgba(13, 12, 11, 0.42);
          --shade: #f2f0ec;
          --rule: rgba(13, 12, 11, 0.16);
          --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
          --pill-bg: #0a0908;
          --pill-fg: #ffffff;
        }

        html {
          -webkit-text-size-adjust: 100%;
        }

        body {
          background: var(--shade);
          color: var(--fg);
          font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
          font-weight: 400;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }

        .boot {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--shade);
          transition: opacity 0.7s var(--ease), visibility 0.7s;
        }
        .boot.done {
          opacity: 0;
          visibility: hidden;
        }
        .boot p {
          font-size: 12.5px;
          letter-spacing: 0.05em;
          color: var(--fg-faint);
        }
        .bar {
          width: 150px;
          height: 1px;
          background: var(--rule);
          overflow: hidden;
        }
        .bar i {
          display: block;
          height: 100%;
          width: 100%;
          background: var(--fg);
          transform: scaleX(0);
          transform-origin: 0 50%;
        }

        .stage {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: var(--shade);
        }
        .stage video {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%) scale(1.02);
          object-fit: cover;
          filter: contrast(1.02);
          will-change: transform;
        }

        .veil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
              to bottom,
              rgba(242, 240, 236, 0.62) 0%,
              rgba(242, 240, 236, 0.12) 22%,
              rgba(242, 240, 236, 0.12) 78%,
              rgba(242, 240, 236, 0.66) 100%
            ),
            radial-gradient(100% 80% at 50% 48%, rgba(242, 240, 236, 0) 0%, rgba(242, 240, 236, 0.34) 100%),
            rgba(242, 240, 236, 0.2);
        }

        .grain {
          position: absolute;
          inset: -50%;
          opacity: 0.13;
          mix-blend-mode: multiply;
          pointer-events: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.5'/></svg>");
        }

        .chrome {
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: max(14px, calc(env(safe-area-inset-top, 0px) + 12px)) clamp(16px, 3.4vw, 44px) 14px;
          background: linear-gradient(to bottom, rgba(242, 240, 236, 0.94) 0%, rgba(242, 240, 236, 0.78) 72%, rgba(242, 240, 236, 0) 100%);
        }

        .mark {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          letter-spacing: -0.012em;
          color: var(--fg);
          min-width: 0;
          flex-shrink: 1;
        }
        .mark-star {
          opacity: 0.85;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2.4vw, 32px);
          flex-shrink: 0;
        }
        .nav a:not(.pill) {
          color: var(--fg);
          text-decoration: none;
          font-size: 14.5px;
          letter-spacing: -0.008em;
          opacity: 0.88;
          transition: opacity 0.3s var(--ease);
        }
        .nav a:not(.pill):hover {
          opacity: 1;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 21px;
          border-radius: 999px;
          background: var(--pill-bg);
          color: var(--pill-fg);
          font-size: 14.5px;
          font-weight: 500;
          letter-spacing: -0.008em;
          text-decoration: none;
          white-space: nowrap;
          opacity: 1;
          border: 1px solid rgba(10, 9, 8, 0.12);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) inset;
          -webkit-text-fill-color: var(--pill-fg);
          transition: transform 0.4s var(--ease), background 0.3s var(--ease), color 0.3s var(--ease);
        }
        .nav .pill {
          color: #fff;
          -webkit-text-fill-color: #fff;
        }
        .pill:hover,
        .pill:focus-visible {
          transform: translateY(-2px);
          background: #000;
          color: #fff;
          -webkit-text-fill-color: #fff;
        }
        .pill:focus-visible {
          outline: 2px solid var(--fg);
          outline-offset: 2px;
        }

        .foot {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          display: flex;
          justify-content: center;
          padding: 14px clamp(16px, 4vw, 24px) max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px));
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0.02em;
          color: var(--fg-faint);
          text-align: center;
          pointer-events: none;
          background: linear-gradient(to top, rgba(242, 240, 236, 0.92) 0%, rgba(242, 240, 236, 0.72) 72%, rgba(242, 240, 236, 0) 100%);
        }

        .meter {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
          height: 2px;
          width: 100%;
          transform: scaleX(0);
          transform-origin: 0 50%;
          background: var(--fg);
          opacity: 0.55;
        }

        .panels {
          position: fixed;
          inset: 0;
          z-index: 20;
          pointer-events: none;
        }
        .panel {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: max(104px, calc(env(safe-area-inset-top, 0px) + 88px)) clamp(20px, 5vw, 60px)
            max(96px, calc(env(safe-area-inset-bottom, 0px) + 80px));
          opacity: 0;
          will-change: opacity, transform;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px 12px;
          font-size: 12.5px;
          letter-spacing: 0.045em;
          color: var(--fg-soft);
          margin-bottom: clamp(16px, 2vw, 22px);
          max-width: min(46ch, 100%);
          text-align: center;
        }

        .panel h1 {
          font-weight: 400;
          font-size: clamp(34px, 7.1vw, 104px);
          line-height: 0.98;
          letter-spacing: -0.036em;
          max-width: 15ch;
          text-wrap: balance;
        }

        .sub {
          margin-top: clamp(18px, 2.2vw, 28px);
          font-size: clamp(15px, 1.28vw, 19px);
          line-height: 1.5;
          letter-spacing: -0.008em;
          color: var(--fg-soft);
          max-width: min(46ch, 100%);
          text-wrap: pretty;
        }

        .cta {
          margin-top: clamp(28px, 3.4vw, 44px);
          pointer-events: auto;
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .cta .pill {
          height: 48px;
          padding: 0 27px;
          font-size: 15px;
          max-width: min(100%, 320px);
        }

        .track {
          position: relative;
          z-index: 1;
          height: 560vh;
          min-height: 3200px;
        }

        @media (max-width: 900px) {
          .veil {
            background: linear-gradient(
                to bottom,
                rgba(242, 240, 236, 0.72) 0%,
                rgba(242, 240, 236, 0.18) 24%,
                rgba(242, 240, 236, 0.18) 76%,
                rgba(242, 240, 236, 0.74) 100%
              ),
              radial-gradient(100% 80% at 50% 48%, rgba(242, 240, 236, 0) 0%, rgba(242, 240, 236, 0.4) 100%),
              rgba(242, 240, 236, 0.24);
          }
        }

        @media (max-width: 720px) {
          .nav a:not(.pill) {
            display: none;
          }
          .mark {
            font-size: 14px;
          }
          .nav .pill {
            height: 38px;
            padding: 0 16px;
            font-size: 13.5px;
          }
          .panel h1 {
            max-width: 12ch;
            font-size: clamp(30px, 9.8vw, 52px);
          }
          .sub {
            font-size: 15px;
            max-width: 34ch;
          }
          .panel {
            padding: max(92px, calc(env(safe-area-inset-top, 0px) + 76px)) 18px
              max(88px, calc(env(safe-area-inset-bottom, 0px) + 72px));
          }
          .foot {
            font-size: 11px;
            max-width: 34ch;
          }
        }

        @media (max-width: 420px) {
          .mark-star {
            display: none;
          }
          .nav .pill {
            height: 36px;
            padding: 0 14px;
            font-size: 13px;
          }
          .panel h1 {
            max-width: 11ch;
            font-size: clamp(28px, 10.5vw, 40px);
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: 0.04em;
            max-width: 28ch;
          }
          .cta .pill {
            width: 100%;
            max-width: 280px;
            height: 44px;
            padding: 0 20px;
            font-size: 14px;
          }
        }

        @media (max-height: 520px) and (orientation: landscape) {
          .panel {
            padding: max(72px, calc(env(safe-area-inset-top, 0px) + 56px)) 24px
              max(64px, calc(env(safe-area-inset-bottom, 0px) + 48px));
          }
          .panel h1 {
            font-size: clamp(28px, 8vh, 44px);
          }
          .sub {
            margin-top: 12px;
            font-size: 14px;
          }
          .cta {
            margin-top: 16px;
          }
        }
      `}</style>
    </>
  );
}
