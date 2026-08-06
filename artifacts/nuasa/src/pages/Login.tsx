import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isAdmin, isLoading: authLoading, refreshProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect if already logged in (only once auth context is settled)
  useEffect(() => {
    if (authLoading || !user) return;
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      setIsLoading(false);
      return;
    }

    // Block admin accounts from using the user login
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (signedInUser) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", signedInUser.id)
        .maybeSingle();
      if (roleData?.role === "admin") {
        await supabase.auth.signOut();
        toast.error("Admin accounts must sign in via the Admin Portal.");
        setIsLoading(false);
        navigate("/admin/login", { replace: true });
        return;
      }
    }

    await refreshProfile();
    toast.success("Welcome back!");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <SEO
        title="Sign In — NUASA National Body"
        description="Sign in to your NUASA account to access the E-Library, save resources, and continue your learning."
        path="/login"
      />
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img
              src={nuasaLogo}
              alt="NUASA National Body logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="font-serif font-bold text-lg text-foreground leading-tight">
              NUASA
            </span>
          </Link>

          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to access your account and resources
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me for 30 days
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">
              Create account
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Are you an admin?{" "}
            <Link to="/admin/login" className="text-accent font-medium hover:underline">
              Admin Login
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex flex-1 hero-gradient items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md text-primary-foreground text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-8">
            <BookOpen className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-serif text-3xl font-bold mb-4">
            Your Gateway to Academic Excellence
          </h2>
          <p className="opacity-80">
            Access thousands of resources, connect with fellow students, and 
            accelerate your academic journey with NUASA's digital platform.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
