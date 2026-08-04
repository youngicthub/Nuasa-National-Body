import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Mail, BookOpen } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

type Status = "verifying" | "success" | "error" | "missing-token";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing-token");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    supabase.auth.verifyEmail(token).then(({ error }) => {
      if (cancelled) return;
      setStatus(error ? "error" : "success");
    });
    return () => { cancelled = true; };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resendVerification(resendEmail);
    setResending(false);
    if (error) {
      toast.error(error.message || "Failed to resend verification email");
      return;
    }
    setResent(true);
  };

  return (
    <div className="min-h-screen flex">
      <SEO title="Verify Email — NUASA" description="Verify your NUASA account email address." path="/verify-email" />

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={nuasaLogo} alt="NUASA logo" className="w-10 h-10 rounded-lg object-cover" />
            <span className="font-serif font-bold text-lg text-foreground">NUASA</span>
          </Link>

          {status === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Verifying your email…</h1>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Email verified!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your email has been verified. You can now sign in to your account.
              </p>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/login">Sign in now</Link>
              </Button>
            </div>
          )}

          {(status === "error" || status === "missing-token") && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                  {status === "missing-token" ? "Invalid verification link" : "Link expired or already used"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email below and we'll send you a fresh verification link.
                </p>
              </div>

              {resent ? (
                <div className="text-center bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <Mail className="w-5 h-5 mx-auto mb-2 text-accent" />
                  If an account exists for that email, a new verification link is on its way.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email Address</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      disabled={resending}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={resending}
                  >
                    {resending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</> : "Resend verification email"}
                  </Button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-accent hover:underline">Back to sign in</Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>

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

export default VerifyEmail;
