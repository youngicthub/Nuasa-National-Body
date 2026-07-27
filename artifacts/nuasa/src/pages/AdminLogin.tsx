import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const AdminLogin = () => {
  const navigate = useNavigate();
  const {
    signIn,
    user,
    isAdmin,
    isLoading: authLoading,
    refreshProfile,
    signOut,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect once auth context confirms admin role — avoids flicker/redirect loops
  useEffect(() => {
    if (authLoading || !user) return;
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      setIsLoading(false);
      return;
    }

    // Verify admin role server-side before redirecting
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    if (signedInUser) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signedInUser.id)
        .maybeSingle();

      if (roleData?.role !== "admin") {
        toast.error(
          "You do not have admin privileges. Use the regular login instead."
        );
        await signOut();
        setIsLoading(false);
        return;
      }

      try {
        await supabase.from("admin_login_log").insert({
          user_id: signedInUser.id,
          email: signedInUser.email ?? email,
          user_agent: navigator.userAgent,
        });
      } catch {
        /* ignore */
      }
    }

    // Refresh auth context so isAdmin is true before navigating — prevents ProtectedRoute bounce
    await refreshProfile();
    toast.success("Welcome back, Admin!");
    setIsLoading(false);
    navigate("/admin/dashboard", { replace: true });
  };

  const handleForgot = async () => {
    if (!forgotEmail) {
      toast.error("Enter your admin email");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset email sent. Check your inbox.");
    setForgotOpen(false);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-primary p-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md'
      >
        <div className='bg-card rounded-2xl border border-border p-8 shadow-xl'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4'>
              <Shield className='w-8 h-8 text-primary-foreground' />
            </div>
            <h1 className='font-serif text-2xl font-bold text-foreground mb-2'>
              Admin Portal
            </h1>
            <p className='text-sm text-muted-foreground'>
              Sign in to manage NUASA resources
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Admin Email</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground' />
                <Input
                  id='email'
                  type='email'
                  placeholder='admin@nuasa.org'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='pl-10'
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password'>Password</Label>
                <button
                  type='button'
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotOpen(true);
                  }}
                  className='text-xs text-accent hover:underline'
                >
                  Forgot password?
                </button>
              </div>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground' />
                <Input
                  id='password'
                  type={showPassword ? "text" : "password"}
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='pl-10 pr-10'
                  required
                  disabled={isLoading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
              </div>
            </div>

            <Button type='submit' className='w-full gap-2' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Verifying admin access...
                </>
              ) : (
                <>
                  Sign In to Admin
                  <ArrowRight className='w-4 h-4' />
                </>
              )}
            </Button>
          </form>

          <div className='mt-8 pt-6 border-t border-border'>
            <p className='text-center text-sm text-muted-foreground'>
              Not an admin?{" "}
              <Link
                to='/login'
                className='text-accent font-medium hover:underline'
              >
                User Login
              </Link>
            </p>
            <p className='mt-4 text-center text-sm text-muted-foreground'>
              Need admin access?{" "}
              <Link
                to='/admin/register'
                className='text-accent font-medium hover:underline'
              >
                Request Access
              </Link>
            </p>
          </div>
        </div>

        <p className='mt-6 text-center text-sm text-primary-foreground/60'>
          <Link to='/' className='hover:underline'>
            ← Back to NUASA Home
          </Link>
        </p>
      </motion.div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset admin password</DialogTitle>
            <DialogDescription>
              We'll email you a secure link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <Label htmlFor='forgot-email'>Admin email</Label>
            <Input
              id='forgot-email'
              type='email'
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder='admin@nuasa.org'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setForgotOpen(false)}
              disabled={forgotLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleForgot} disabled={forgotLoading}>
              {forgotLoading ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                "Send reset link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogin;
