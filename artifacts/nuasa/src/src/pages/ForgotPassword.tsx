import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, BookOpen } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not send reset email.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SEO title="Forgot Password — NUASA" description="Reset your NUASA account password." path="/forgot-password" />

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={nuasaLogo} alt="NUASA logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-serif font-bold text-lg text-foreground">NUASA</span>
          </Link>

          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                If <strong>{email}</strong> is registered, we've sent a password reset link. Check your inbox (and spam folder). The link expires in 60 minutes.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
              <p className="text-muted-foreground mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><ArrowRight className="w-4 h-4" /> Send Reset Link</>
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
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

export default ForgotPassword;
