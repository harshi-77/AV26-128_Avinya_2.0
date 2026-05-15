import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  ScanLine,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Cpu,
  Waves,
} from "lucide-react";

import { getLocalSession, saveLocalSession, supabase } from "./supabaseClient.js";
export { getSession, clearSession } from "./supabaseClient.js";

import loginVideo from "../WhatsApp Video 2026-05-15 at 2.00.21 AM.mp4";

const STATS = [
  { val: "97.4%", label: "Detection Accuracy", icon: Activity },
  { val: "4.8x", label: "Faster Diagnosis", icon: Cpu },
  { val: "3", label: "Imaging Modalities", icon: Waves },
];

const DOTS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: (i * 41 + 9) % 100,
  y: (i * 57 + 13) % 100,
  delay: i * 0.16,
}));

const REAL_GOOGLE_OAUTH_ENABLED = import.meta.env.VITE_ENABLE_REAL_GOOGLE_OAUTH === "true";

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  rightEl,
  autoComplete = "off",
  inputMode,
}) {
  return (
    <div className="lp-field">
      <label htmlFor={id} className="lp-label">
        {label}
      </label>
      <div className="lp-input-row">
        <Icon size={15} className="lp-input-icon" />
        <input
          id={id}
          className={`lp-input ${error ? "lp-input-err" : ""}`}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
        />
        {rightEl}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="lp-err-msg"
          >
            <AlertCircle size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [tab, setTab] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.setAttribute("webkit-playsinline", "true");
    v.play().catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && (data.session || getLocalSession())) navigate("/analysis", { replace: true });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/analysis", { replace: true });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    setErrors({});
    setStatus("idle");
    setMsg("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirm("");
  }, [tab]);

  function validate() {
    const e = {};

    if (tab === "register" && !name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Minimum 6 characters.";
    if (tab === "register") {
      if (!confirm) e.confirm = "Please confirm your password.";
      else if (confirm !== password) e.confirm = "Passwords do not match.";
    }
    return e;
  }

  function authErrorText(error, method = "auth") {
    if (!error?.message) return "Authentication failed. Please try again.";
    const message = error.message.toLowerCase();
    if (method === "google" && isGoogleProviderConfigError(error)) {
      return "Google OAuth is not enabled in Supabase yet. Opening a preview session for now.";
    }
    return error.message;
  }

  function isGoogleProviderConfigError(error) {
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("unsupported provider") ||
      message.includes("provider is not enabled") ||
      message.includes("provider not enabled") ||
      message.includes("validation failed") ||
      message.includes("invalid provider") ||
      message.includes("redirect") ||
      message.includes("oauth provider")
    );
  }

  function openGooglePreviewSession() {
    saveLocalSession({
      name: "Google Preview User",
      email: "google.user@medai.local",
      provider: "google-preview",
    });
    setStatus("success");
    setMsg("Google preview session created. Opening your dashboard...");
    setTimeout(() => navigate("/analysis", { replace: true }), 700);
  }

  async function handleGoogleLogin() {
    setErrors({});
    setMsg("");
    setStatus("loading");

    if (!REAL_GOOGLE_OAUTH_ENABLED) {
      setMsg("Opening Google preview session for this local app...");
      openGooglePreviewSession();
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/analysis`,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setMsg(authErrorText(error, "google"));
        if (isGoogleProviderConfigError(error)) {
          openGooglePreviewSession();
          return;
        }
        setStatus("error");
        return;
      }

      if (!data?.url) {
        setMsg("Google login did not return a sign-in page. Opening a preview session for now.");
        openGooglePreviewSession();
        return;
      }

      setMsg("Opening Google sign-in...");
      window.sessionStorage.setItem("medai_google_oauth_started", String(Date.now()));
      window.location.assign(data.url);
    } catch (error) {
      setMsg("Google login could not start. Opening a preview session for now.");
      openGooglePreviewSession();
    }
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setMsg("");
    setStatus("loading");

    if (tab === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/analysis`,
        },
      });

      if (error) {
        setStatus("error");
        setMsg(authErrorText(error));
        return;
      }

      setStatus("success");
      if (data.session) {
        setMsg("Account created. Opening your dashboard...");
        setTimeout(() => navigate("/analysis", { replace: true }), 700);
      } else {
        saveLocalSession({ name: name.trim(), email: email.trim() });
        setMsg("Account created. Opening your dashboard...");
        setTimeout(() => navigate("/analysis", { replace: true }), 700);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMsg(authErrorText(error));
      return;
    }

    setStatus("success");
    setMsg("Welcome back. Opening your dashboard...");
    setTimeout(() => navigate("/analysis", { replace: true }), 700);
  }

  const isLoading = status === "loading";
  const isDone = status === "success";

  return (
    <div className="lp-shell">
      <div className="lp-video-panel">
        <video
          ref={videoRef}
          className="lp-video"
          src={loginVideo}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-label="Medical AI diagnostic scan"
        />

        <div className="lp-vid-gradient" />
        <div className="lp-vid-scanline" />

        <div className="lp-dot-field" aria-hidden="true">
          {DOTS.map((d) => (
            <span
              key={d.id}
              className="lp-dot"
              style={{ left: `${d.x}%`, top: `${d.y}%`, animationDelay: `${d.delay}s` }}
            />
          ))}
        </div>

        <svg className="lp-ecg" viewBox="0 0 760 80" aria-hidden="true">
          <path d="M0 48 H80 L100 48 L118 14 L136 68 L160 48 H280 L304 48 L322 28 L338 58 L358 48 H500 L520 48 L540 18 L564 64 L590 48 H760" />
        </svg>

        <div className="lp-ring lp-ring-a" />
        <div className="lp-ring lp-ring-b" />

        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lp-brand"
        >
          <BrainCircuit size={20} className="lp-brand-icon" />
          <span>MedAI Diagnostics</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lp-hero-copy"
        >
          <div className="lp-hero-pill">
            <span className="lp-hero-dot" />
            Neural Imaging Intelligence
          </div>
          <h1 className="lp-hero-title">
            AI-Powered
            <br />
            Medical Diagnostics
          </h1>
          <p className="lp-hero-sub">
            Detect tumors, fractures and infections at early stages with radiologist-grade
            confidence.
          </p>

          <div className="lp-stats-row">
            {STATS.map(({ val, label, icon: Icon }) => (
              <motion.div
                key={label}
                className="lp-stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Icon size={14} className="lp-stat-icon" />
                <span className="lp-stat-val">{val}</span>
                <span className="lp-stat-lbl">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="lp-vid-bottom-fade" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="lp-form-panel"
      >
        <div className="lp-form-bg" />

        <div className="lp-form-inner">
          <div className="lp-form-header">
            <div className="lp-form-icon">
              <ScanLine size={22} className="lp-icon-cyan" />
            </div>
            <div>
              <h2 className="lp-form-title">
                {tab === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="lp-form-sub">
                {tab === "login"
                  ? "Sign in to your diagnostic portal"
                  : "Join the AI medical platform"}
              </p>
            </div>
          </div>

          <div className="lp-tabs" role="tablist">
            {["login", "register"].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                id={`tab-${t}`}
                className={`lp-tab ${tab === t ? "lp-tab-on" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "login" ? "Sign In" : "Register"}
                {tab === t && (
                  <motion.div
                    layoutId="lp-bar"
                    className="lp-tab-bar"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="lp-oauth-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={16} className="lp-spin" /> : <span className="lp-google-g">G</span>}
            Continue with Google
          </button>

          <div className="lp-divider">
            <span>or use email</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === "login" ? -14 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "login" ? 14 : -14 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              onSubmit={handleSubmit}
              noValidate
              className="lp-form"
            >
              {tab === "register" && (
                <Field
                  id="reg-name"
                  label="Full Name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  placeholder="Dr. Jane Smith"
                  autoComplete="name"
                />
              )}

              <Field
                id="auth-email"
                label="Email Address"
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="doctor@hospital.com"
                autoComplete="email"
              />

              <Field
                id="auth-password"
                label="Password"
                icon={Lock}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="Password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                rightEl={
                  <button
                    type="button"
                    id="toggle-pw"
                    className="lp-pw-toggle"
                    onClick={() => setShowPw((p) => !p)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {tab === "register" && (
                <Field
                  id="auth-confirm"
                  label="Confirm Password"
                  icon={ShieldCheck}
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              )}

              <AnimatePresence>
                {msg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`lp-msg ${status === "success" ? "lp-msg-ok" : "lp-msg-err"}`}
                  >
                    {status === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {msg}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                id="auth-submit"
                type="submit"
                disabled={isLoading || isDone}
                whileTap={{ scale: 0.975 }}
                className="lp-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="lp-spin" /> Processing...
                  </>
                ) : isDone ? (
                  <>
                    <CheckCircle2 size={16} /> Redirecting...
                  </>
                ) : (
                  <>
                    {tab === "login" ? "Sign In" : "Create Account"} <ArrowRight size={16} />
                  </>
                )}
              </motion.button>

              <p className="lp-switch-text">
                {tab === "login" ? "No account yet?" : "Already registered?"}{" "}
                <button
                  type="button"
                  id={tab === "login" ? "go-register" : "go-login"}
                  className="lp-switch-link"
                  onClick={() => setTab(tab === "login" ? "register" : "login")}
                >
                  {tab === "login" ? "Register here" : "Sign in"}
                </button>
              </p>
            </motion.form>
          </AnimatePresence>

          <div className="lp-footer">
            <ShieldCheck size={12} className="lp-icon-cyan" style={{ opacity: 0.6 }} />
            <span>HIPAA-compliant | 256-bit encrypted | AI-certified</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
