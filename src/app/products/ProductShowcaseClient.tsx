"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

type Product = {
  id: string;
  name: string | null;
  product_code: string | null;
  stock_quantity: number | null;
  boxes: number | null;
  image_url: string | null;
  detail: string | null;
};

export default function ProductShowcaseClient({
  products,
  fallbackImage,
}: {
  products: Product[];
  fallbackImage: string;
}) {
  // ---------------------------------------------------------------
  // Auth / admin state — เหมือนของเดิมทุกอย่าง ไม่ได้แตะ logic
  // ---------------------------------------------------------------
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [showLogin, setShowLogin] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);

  const refreshAdminStatus = async (userId: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    setIsAdmin(profile?.role === "admin");
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
      await refreshAdminStatus(user?.id ?? null);
      setCheckingAuth(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      await refreshAdminStatus(session?.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const openLogin = () => {
    setLoginError("");
    setEmail("");
    setPassword("");
    setShowLogin(true);
    requestAnimationFrame(() => setLoginVisible(true));
  };

  const closeLogin = () => {
    setLoginVisible(false);
    setTimeout(() => setShowLogin(false), 200);
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoggingIn(false);

    if (error) {
      setLoginError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    closeLogin();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsAdmin(false);
  };

  const openModal = (p: Product) => {
    setSelected(p);
    setForm(p);
    setIsEditing(false);
    requestAnimationFrame(() => setVisible(true));
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => {
      setSelected(null);
      setIsEditing(false);
    }, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        closeLogin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        name: form.name,
        stock_quantity: form.stock_quantity,
        boxes: form.boxes,
        image_url: form.image_url,
        detail: form.detail,
      })
      .eq("id", selected.id);

    setSaving(false);

    if (!error) {
      const updated = { ...selected, ...form } as Product;
      setLocalProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelected(updated);
      setIsEditing(false);
    } else {
      alert("Failed to save: " + error.message);
    }
  };

  // ---------------------------------------------------------------
  // Scroll-scrubbed video showcase — สินค้าแต่ละชิ้นได้ "แผง" ของตัวเอง
  // ที่ fade in/out ตามตำแหน่ง scroll แทนที่จะเป็น carousel เลื่อนแนวนอน
  //
  // วิดีโอพื้นหลังตอนนี้ยังเป็น placeholder (ของเดิมจากสเปค Cast & Render) —
  // แนะนำให้เปลี่ยนเป็นฟุตเทจโกดัง/สินค้าจริงของคุณทีหลังผ่านตัวแปร VIDEO_URL
  // ด้านล่าง
  // ---------------------------------------------------------------
  const clipRef = useRef<HTMLVideoElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootBarRef = useRef<HTMLElement>(null);
  const bootPctRef = useRef<HTMLParagraphElement>(null);
  const meterRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);

  const count = Math.max(localProducts.length, 1);

  // แบ่ง scroll 0..1 ออกเป็น "ช่อง" เท่าๆ กันตามจำนวนสินค้า แต่ละช่องมี fade-in
  // ช่วงต้นกับ fade-out ช่วงท้าย ส่วนตรงกลางแผงจะอยู่นิ่งให้อ่าน/กดปุ่มได้
  const cues = useMemo<[number, number, number, number][]>(() => {
    const slot = 1 / count;
    const fade = slot * 0.32;
    return Array.from({ length: count }, (_, i) => {
      const start = i * slot;
      const end = start + slot;
      return [start, start + fade, end - fade, end];
    });
  }, [count]);

  useEffect(() => {
    const clip = clipRef.current;
    const boot = bootRef.current;
    const bootBar = bootBarRef.current;
    const bootPct = bootPctRef.current;
    const meter = meterRef.current;
    const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
    if (!clip || !boot || !bootBar || !bootPct || !meter) return;

    const VIDEO_URL =
      "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/45567745-d826-44a2-a5ce-7ef670944e60.mp4";
    const DRIFT = 22;

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
        const c = cues[i];
        if (!c) return;
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
      setTimeout(start, 12000);
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
              if (done) return new Blob(chunks as BlobPart[], { type: "video/mp4" });
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
          clearTimeout(bail);
          setProgress(1);
          attach(VIDEO_URL);
        });
    }

    function unlock() {
      const p = clip?.play();
      if (p && typeof p.then === "function") {
        p.then(() => clip?.pause()).catch(() => {});
      } else {
        clip?.pause();
      }
    }
    const unlockEvents: (keyof WindowEventMap)[] = ["touchstart", "pointerdown", "wheel", "keydown"];
    unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, { once: true, passive: true }));

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
  }, [cues]);

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
        <video id="clip" ref={clipRef} muted playsInline preload="auto" disablePictureInPicture />
        <div className="veil" />
        <div className="grain" />
      </div>

      <i className="meter" id="meter" ref={meterRef as any} />

      <header className="chrome">
        <div className="mark">
          <span className="mark-star" aria-hidden="true">
            &#10037;
          </span>
          &nbsp;Happy Inventory
        </div>

        {/* account bar — เดิมอยู่นอก header แบบ static, ย้ายมาไว้ใน chrome แทน nav */}
        <div className="nav">
          {checkingAuth ? null : userEmail ? (
            <div className="account-chip">
              <span>
                {userEmail} {isAdmin && <span className="account-admin">· Admin</span>}
              </span>
              <button onClick={handleLogout} className="account-logout">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={openLogin} className="pill">
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="panels">
        {localProducts.length === 0 && (
          <section className="panel" style={{ opacity: 1 }}>
            <div className="eyebrow">Product Catalog</div>
            <h1>ยังไม่มีสินค้า</h1>
            <p className="sub">เพิ่มสินค้าเข้าระบบเพื่อให้แสดงที่นี่</p>
          </section>
        )}

        {localProducts.map((p, i) => {
          const isAvailable = !!p.stock_quantity && p.stock_quantity > 0;
          return (
            <section
              className="panel"
              data-panel
              key={p.id}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
            >
              <div className="product-media">
                <img src={p.image_url?.trim() || fallbackImage} alt={p.name || ""} />
              </div>

              <div className="eyebrow">CODE &middot; {p.product_code || "—"}</div>
              <h1>{p.name || "Unnamed Product"}</h1>
              <p className="sub">{p.detail || "ยังไม่มีรายละเอียดเพิ่มเติม"}</p>

              <div className="stat-row">
                <span className={`stat-dot ${isAvailable ? "in" : "out"}`} />
                <span className="stat-text">
                  {isAvailable
                    ? `${p.stock_quantity?.toLocaleString()} kg in stock · ${p.boxes || 0} boxes`
                    : "Out of stock"}
                </span>
              </div>

              <div className="cta">
                <button className="pill" onClick={() => openModal(p)}>
                  View details
                </button>
              </div>
            </section>
          );
        })}
      </main>

      <footer className="foot">© 2026 Happy Inventory System &nbsp;&middot;&nbsp; CSW Logistics Group</footer>

      <div className="track" style={{ height: `${count * 140}vh`, minHeight: `${count * 900}px` }} />

      {/* ---------- Login popup (เหมือนเดิมทุกอย่าง) ---------- */}
      {showLogin && (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
            loginVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeLogin}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 transform transition-all duration-200 ease-out ${
              loginVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            }`}
          >
            <button
              onClick={closeLogin}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-1">
              Happy <span className="text-blue-600">Inventory</span>
            </h2>
            <p className="text-slate-500 text-sm mb-6">เข้าสู่ระบบเพื่อจัดการสต็อกสินค้า</p>

            <label className="text-sm font-bold text-slate-600 mb-1 block">อีเมลพนักงาน</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />

            <label className="text-sm font-bold text-slate-600 mb-1 block">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-2 outline-none focus:border-blue-500"
              placeholder="••••••••"
            />

            {loginError && <p className="text-red-500 text-sm font-medium mb-2">{loginError}</p>}

            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Product detail modal (เหมือนเดิมทุกอย่าง) ---------- */}
      {selected && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-200 ease-out ${
              visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            }`}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 shadow transition-colors"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="h-72 bg-slate-200 overflow-hidden relative">
              {isEditing ? (
                <input
                  className="absolute bottom-3 left-3 right-3 text-xs bg-white/90 rounded-lg px-3 py-2 shadow"
                  placeholder="Image URL"
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              ) : null}
              <img
                src={(isEditing ? form.image_url : selected.image_url)?.trim() || fallbackImage}
                className="w-full h-full object-cover"
                alt={selected.name || ""}
              />
            </div>

            <div className="p-7">
              <code className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase font-mono">
                CODE: {selected.product_code}
              </code>

              {isEditing ? (
                <input
                  className="mt-2 w-full text-2xl font-extrabold text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <h2 className="mt-2 text-2xl font-extrabold text-slate-800">
                  {selected.name || "Unnamed Product"}
                </h2>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Stock (kg)</p>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full text-lg font-black text-blue-600 border-b border-slate-200 focus:border-blue-500 outline-none"
                      value={form.stock_quantity ?? 0}
                      onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                    />
                  ) : (
                    <p className="text-lg font-black text-blue-600">
                      {selected.stock_quantity?.toLocaleString() || "0"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Boxes</p>
                  {isEditing ? (
                    <input
                      type="number"
                      className="w-full text-lg font-black text-slate-700 border-b border-slate-200 focus:border-blue-500 outline-none"
                      value={form.boxes ?? 0}
                      onChange={(e) => setForm({ ...form, boxes: Number(e.target.value) })}
                    />
                  ) : (
                    <p className="text-lg font-black text-slate-700">{selected.boxes || 0}</p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">รายละเอียดเพิ่มเติม</p>
                {isEditing ? (
                  <textarea
                    className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2 focus:border-blue-500 outline-none resize-none"
                    rows={4}
                    value={form.detail || ""}
                    onChange={(e) => setForm({ ...form, detail: e.target.value })}
                    placeholder="เช่น วัสดุ, ที่มา, คุณภาพ, หมายเหตุอื่นๆ"
                  />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.detail || "—"}</p>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-3 mt-8 pt-5 border-t border-slate-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setForm(selected);
                          setIsEditing(false);
                        }}
                        className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                    >
                      Edit Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          --blue: #2563eb;
        }

        html {
          -webkit-text-size-adjust: 100%;
        }

        body {
          background: var(--shade);
          color: var(--fg);
          font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
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
              rgba(242, 240, 236, 0.68) 0%,
              rgba(242, 240, 236, 0.22) 22%,
              rgba(242, 240, 236, 0.22) 78%,
              rgba(242, 240, 236, 0.72) 100%
            ),
            radial-gradient(100% 80% at 50% 48%, rgba(242, 240, 236, 0) 0%, rgba(242, 240, 236, 0.34) 100%),
            rgba(242, 240, 236, 0.24);
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
          font-weight: 500;
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
          gap: 12px;
          flex-shrink: 0;
        }

        .account-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: #fff;
          border: 1px solid var(--rule);
          border-radius: 999px;
          font-size: 13px;
          color: var(--fg-soft);
          box-shadow: 0 1px 2px rgba(13, 12, 11, 0.04);
        }
        .account-admin {
          color: var(--blue);
          font-weight: 500;
        }
        .account-logout {
          color: var(--fg-faint);
          font-weight: 500;
          transition: color 0.3s var(--ease);
        }
        .account-logout:hover {
          color: #dc2626;
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
          border: 1px solid rgba(10, 9, 8, 0.12);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) inset;
          -webkit-text-fill-color: var(--pill-fg);
          cursor: pointer;
          transition: transform 0.4s var(--ease), background 0.3s var(--ease);
        }
        .pill:hover {
          transform: translateY(-2px);
          background: #000;
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

        .product-media {
          width: min(340px, 78vw);
          height: 240px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(13, 12, 11, 0.18);
          margin-bottom: clamp(20px, 2.6vw, 28px);
          background: #fff;
        }
        .product-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .eyebrow {
          font-size: 12.5px;
          letter-spacing: 0.045em;
          color: var(--fg-soft);
          margin-bottom: 10px;
        }

        .panel h1 {
          font-weight: 400;
          font-size: clamp(28px, 5.6vw, 64px);
          line-height: 1.02;
          letter-spacing: -0.03em;
          max-width: 16ch;
          text-wrap: balance;
        }

        .sub {
          margin-top: 12px;
          font-size: clamp(14px, 1.2vw, 17px);
          line-height: 1.5;
          letter-spacing: -0.006em;
          color: var(--fg-soft);
          max-width: min(46ch, 100%);
        }

        .stat-row {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--fg-soft);
        }
        .stat-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
        }
        .stat-dot.in {
          background: #22c55e;
        }
        .stat-dot.out {
          background: #ef4444;
        }

        .cta {
          margin-top: clamp(22px, 3vw, 32px);
          pointer-events: auto;
        }

        .track {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 720px) {
          .mark {
            font-size: 14px;
          }
          .account-chip {
            font-size: 12px;
            padding: 6px 12px;
            gap: 8px;
          }
          .panel h1 {
            max-width: 13ch;
            font-size: clamp(26px, 8vw, 40px);
          }
          .sub {
            font-size: 14px;
            max-width: 32ch;
          }
          .foot {
            font-size: 11px;
            max-width: 34ch;
          }
        }
      `}</style>
    </>
  );
}
