import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, BookOpen, KeyRound, Lock, Eye, EyeOff, Copy, Check } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

type Step = "email" | "otp" | "password" | "done";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");

  // Step 1
  const [email, setEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [copied, setCopied] = useState(false);

  // Step 2
  const [otpInput, setOtpInput] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);

  // Step 3
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);

  // ── Step 1: request OTP ──────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoadingEmail(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }
      if (data.otp) {
        setGeneratedOtp(data.otp);
        setStep("otp");
      } else {
        // Email not registered — show generic message without revealing that
        toast.info("If that email is registered, a code has been issued.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingEmail(false);
    }
  };

  const copyOtp = () => {
    navigator.clipboard.writeText(generatedOtp).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim() === generatedOtp) {
      setStep("password");
    } else {
      toast.error("Incorrect code. Please check the code shown above and try again.");
    }
  };

  // ── Step 3: set new password ─────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoadingPw(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp: generatedOtp, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password. Please start over.");
        setStep("email");
        setGeneratedOtp("");
        setOtpInput("");
        return;
      }
      setStep("done");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingPw(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SEO title="Reset Password — NUASA" description="Reset your NUASA account password." path="/forgot-password" />

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={nuasaLogo} alt="NUASA logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-serif font-bold text-lg text-foreground">NUASA</span>
          </Link>

          <AnimatePresence mode="wait">

            {/* ── Step 1: Enter email ─────────────────────────────────────── */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
                <p className="text-muted-foreground mb-8">
                  Enter your email and we'll generate a one-time code for you.
                </p>
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={loadingEmail}
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loadingEmail}>
                    {loadingEmail
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                      : <><ArrowRight className="w-4 h-4" /> Get Reset Code</>}
                  </Button>
                </form>
                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: Show OTP + verify ───────────────────────────────── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl font-bold text-foreground">Your reset code</h1>
                    <p className="text-sm text-muted-foreground">This code expires in 15 minutes.</p>
                  </div>
                </div>

                {/* OTP display */}
                <div className="bg-muted rounded-xl p-6 mb-6 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">One-Time Password</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground select-all">
                      {generatedOtp}
                    </span>
                    <button
                      type="button"
                      onClick={copyOtp}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    For <strong>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter the code above to continue</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center font-mono text-xl tracking-widest"
                      maxLength={6}
                      required
                      disabled={loadingOtp}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loadingOtp || otpInput.length < 6}>
                    {loadingOtp
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                      : <><ArrowRight className="w-4 h-4" /> Verify Code</>}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setStep("email"); setGeneratedOtp(""); setOtpInput(""); }}
                  className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use a different email
                </button>
              </motion.div>
            )}

            {/* ── Step 3: Set new password ────────────────────────────────── */}
            {step === "password" && (
              <motion.div key="password" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Set new password</h1>
                <p className="text-muted-foreground mb-8">Choose a strong password for your account.</p>

                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        disabled={loadingPw}
                        minLength={8}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">At least 8 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type={showPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="pl-10"
                        required
                        disabled={loadingPw}
                        minLength={8}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loadingPw}>
                    {loadingPw ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Set New Password"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── Done ────────────────────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Password updated!</h1>
                <p className="text-muted-foreground text-sm mb-4">Redirecting you to sign in…</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Sign in now</Link>
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Branding side */}
      <div className="hidden lg:flex flex-1 hero-gradient items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-sm">
          <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="font-serif text-3xl font-bold mb-4">NUASA National E-Library</h2>
          <p className="opacity-70 leading-relaxed">
            Access thousands of academic resources, research papers, and study materials.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
