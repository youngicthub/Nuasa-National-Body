import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, BookOpen } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) setTokenMissing(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password. The link may have expired.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SEO title="Reset Password — NUASA" description="Set a new password for your NUASA account." path="/reset-password" />

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={nuasaLogo} alt="NUASA logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-serif font-bold text-lg text-foreground">NUASA</span>
          </Link>

          {tokenMissing ? (
            <div className="text-center py-8">
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Invalid reset link</h1>
              <p className="text-muted-foreground text-sm mb-6">
                This link is missing a reset token. Please use the link sent to your email, or request a new one.
              </p>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Password updated!</h1>
              <p className="text-muted-foreground text-sm mb-4">Redirecting you to sign in…</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Sign in now</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Set new password</h1>
              <p className="text-muted-foreground mb-8">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      disabled={loading}
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
                      disabled={loading}
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Updating…</> : "Set New Password"}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                <Link to="/forgot-password" className="text-accent hover:underline">Request a new link</Link>
              </p>
            </>
          )}
        </motion.div>
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

export default ResetPassword;
