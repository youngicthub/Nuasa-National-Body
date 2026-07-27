import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import {
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  User,
  Lock,
  Bell,
  Palette,
  Save,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FlutterwaveSettings {
  public_key?: string;
  secret_key?: string;
  encryption_key?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const navigate = useNavigate();
  const { signOut, user, profile, refreshProfile } = useAuth();

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [fullName, setFullName]           = useState("");
  const [institution, setInstitution]     = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Security ─────────────────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword]   = useState(false);

  // ── Site Settings (local only for now) ───────────────────────────────────────
  const [siteName, setSiteName]                     = useState("NUASA National Body E-Library");
  const [siteTagline, setSiteTagline]               = useState("Empowering Nigerian accounting students with quality resources.");
  const [contactEmail, setContactEmail]             = useState("info@nuasa.org");
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [maintenanceMode, setMaintenanceMode]       = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newResourceAlerts, setNewResourceAlerts]   = useState(true);
  const [theme, setTheme]                           = useState<"light" | "dark" | "system">(
    (localStorage.getItem("nuasa-theme") as "light" | "dark" | "system") || "system",
  );

  // ── Flutterwave ───────────────────────────────────────────────────────────────
  const [flwPublicKey, setFlwPublicKey]         = useState("");
  const [flwSecretKey, setFlwSecretKey]         = useState("");
  const [flwEncryptionKey, setFlwEncryptionKey] = useState("");
  const [showSecret, setShowSecret]             = useState(false);
  const [showEncryption, setShowEncryption]     = useState(false);
  const [loadingFlw, setLoadingFlw]             = useState(true);
  const [savingFlw, setSavingFlw]               = useState(false);
  const [flwSaved, setFlwSaved]                 = useState(false);

  // ── Load Flutterwave keys from DB on mount ─────────────────────────────────
  useEffect(() => {
    apiFetch<{ data: FlutterwaveSettings; error: null }>("/admin/settings/flutterwave")
      .then(({ data }) => {
        setFlwPublicKey(data?.public_key     || "");
        setFlwSecretKey(data?.secret_key     || "");
        setFlwEncryptionKey(data?.encryption_key || "");
      })
      .catch(() => {/* keys simply stay blank if fetch fails */})
      .finally(() => setLoadingFlw(false));
  }, []);

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name     || "");
      setInstitution(profile.institution  || "");
      setAcademicLevel(profile.academic_level || "");
    }
  }, [profile]);

  // ── Load site settings from localStorage ─────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("nuasa-site-settings");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setSiteName(s.siteName ?? siteName);
        setSiteTagline(s.siteTagline ?? siteTagline);
        setContactEmail(s.contactEmail ?? contactEmail);
        setAllowRegistrations(s.allowRegistrations ?? true);
        setMaintenanceMode(s.maintenanceMode ?? false);
        setEmailNotifications(s.emailNotifications ?? true);
        setNewResourceAlerts(s.newResourceAlerts ?? true);
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  // ── Save Flutterwave keys → database ─────────────────────────────────────
  const saveFlutterwave = async () => {
    if (!flwPublicKey.trim()) {
      toast.error("Public Key is required");
      return;
    }
    setSavingFlw(true);
    setFlwSaved(false);
    try {
      await apiFetch("/admin/settings/flutterwave", {
        method: "PUT",
        body: JSON.stringify({
          public_key:     flwPublicKey.trim(),
          secret_key:     flwSecretKey.trim(),
          encryption_key: flwEncryptionKey.trim(),
        }),
      });
      toast.success("Flutterwave keys saved to database");
      setFlwSaved(true);
      setTimeout(() => setFlwSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save Flutterwave keys");
    } finally {
      setSavingFlw(false);
    }
  };

  // ── Save profile (uses local API via /api/auth endpoint) ─────────────────
  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await apiFetch(`/data/profiles?eq.user_id=${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name:      fullName,
          institution:    institution || null,
          academic_level: academicLevel || null,
        }),
      });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const updatePassword = async () => {
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPassword(true);
    try {
      await apiFetch("/auth/password", {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const saveSiteSettings = () => {
    localStorage.setItem("nuasa-site-settings", JSON.stringify({
      siteName, siteTagline, contactEmail,
      allowRegistrations, maintenanceMode, emailNotifications, newResourceAlerts,
    }));
    toast.success("Site settings saved");
  };

  const applyTheme = (val: "light" | "dark" | "system") => {
    setTheme(val);
    localStorage.setItem("nuasa-theme", val);
    const root = document.documentElement;
    const isDark =
      val === "dark" ||
      (val === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    toast.success(`Theme set to ${val}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Settings</h1>
              <p className="text-muted-foreground">
                Manage your profile, security, site preferences, and payment gateway.
              </p>
            </div>

            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6">
                <TabsTrigger value="profile"       className="gap-2"><User        className="w-4 h-4" /> Profile</TabsTrigger>
                <TabsTrigger value="security"      className="gap-2"><Lock        className="w-4 h-4" /> Security</TabsTrigger>
                <TabsTrigger value="site"          className="gap-2"><SettingsIcon className="w-4 h-4" /> Site</TabsTrigger>
                <TabsTrigger value="payments"      className="gap-2"><CreditCard  className="w-4 h-4" /> Payments</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2"><Bell        className="w-4 h-4" /> Alerts</TabsTrigger>
                <TabsTrigger value="appearance"    className="gap-2"><Palette     className="w-4 h-4" /> Theme</TabsTrigger>
              </TabsList>

              {/* ── Profile ─────────────────────────────────────────────── */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Profile</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input value={user?.email || ""} disabled />
                      </div>
                      <div>
                        <Label>Full Name</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Institution</Label>
                        <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
                      </div>
                      <div>
                        <Label>Academic Level</Label>
                        <Input value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Profile
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Security ────────────────────────────────────────────── */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Use a strong password (min 8 characters).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>New Password</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                        <Label>Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={updatePassword} disabled={savingPassword} className="gap-2">
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Update Password
                    </Button>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold mb-1">Sign out</h4>
                      <p className="text-sm text-muted-foreground mb-3">End your current admin session.</p>
                      <Button variant="destructive" onClick={handleLogout} className="gap-2">
                        <LogOut className="w-4 h-4" /> Sign out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Site ────────────────────────────────────────────────── */}
              <TabsContent value="site">
                <Card>
                  <CardHeader>
                    <CardTitle>Site Settings</CardTitle>
                    <CardDescription>Configure global site information and access.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Site Name</Label>
                      <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Tagline</Label>
                      <Textarea value={siteTagline} onChange={(e) => setSiteTagline(e.target.value)} rows={2} />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Allow new registrations</p>
                        <p className="text-sm text-muted-foreground">Let new users sign up for accounts.</p>
                      </div>
                      <Switch checked={allowRegistrations} onCheckedChange={setAllowRegistrations} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Maintenance mode</p>
                        <p className="text-sm text-muted-foreground">Temporarily restrict the site to admins only.</p>
                      </div>
                      <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                    </div>
                    <Button onClick={saveSiteSettings} className="gap-2">
                      <Save className="w-4 h-4" /> Save Site Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Payments / Flutterwave ───────────────────────────────── */}
              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-accent" />
                          Flutterwave Payment Gateway
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Enter your Flutterwave API keys. They are stored in the database and used
                          to process convention registration payments.
                        </CardDescription>
                      </div>
                      {flwSaved && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Saved
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {loadingFlw ? (
                      <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading saved keys…
                      </div>
                    ) : (
                      <>
                        {/* Public Key */}
                        <div>
                          <Label htmlFor="flw-public">Public Key <span className="text-destructive">*</span></Label>
                          <Input
                            id="flw-public"
                            placeholder="FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                            value={flwPublicKey}
                            onChange={(e) => setFlwPublicKey(e.target.value)}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Used on the checkout page. Safe to expose to browsers.
                          </p>
                        </div>

                        {/* Secret Key */}
                        <div>
                          <Label htmlFor="flw-secret">Secret Key</Label>
                          <div className="flex gap-2">
                            <Input
                              id="flw-secret"
                              type={showSecret ? "text" : "password"}
                              placeholder="FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                              value={flwSecretKey}
                              onChange={(e) => setFlwSecretKey(e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowSecret((v) => !v)}
                              aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used by the server only. Never exposed to the browser.
                          </p>
                        </div>

                        {/* Encryption Key */}
                        <div>
                          <Label htmlFor="flw-encrypt">Encryption Key <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <div className="flex gap-2">
                            <Input
                              id="flw-encrypt"
                              type={showEncryption ? "text" : "password"}
                              placeholder="FLWENCK-…"
                              value={flwEncryptionKey}
                              onChange={(e) => setFlwEncryptionKey(e.target.value)}
                              className="font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowEncryption((v) => !v)}
                              aria-label={showEncryption ? "Hide encryption key" : "Show encryption key"}
                            >
                              {showEncryption ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Info banner */}
                        <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">Where to find your keys</p>
                          <p>Log in to your <a href="https://dashboard.flutterwave.com/settings/apis" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">Flutterwave dashboard → Settings → API</a> and copy the keys for your environment.</p>
                          <p>Use <span className="font-mono bg-background px-1 rounded">Test</span> keys during development and <span className="font-mono bg-background px-1 rounded">Live</span> keys in production.</p>
                        </div>

                        <Button
                          onClick={saveFlutterwave}
                          disabled={savingFlw}
                          className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          {savingFlw
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />}
                          Save Flutterwave Keys
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Notifications ────────────────────────────────────────── */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Choose what alerts the admin receives.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email notifications</p>
                        <p className="text-sm text-muted-foreground">Receive important updates via email.</p>
                      </div>
                      <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New resource alerts</p>
                        <p className="text-sm text-muted-foreground">Notify when new resources are uploaded.</p>
                      </div>
                      <Switch checked={newResourceAlerts} onCheckedChange={setNewResourceAlerts} />
                    </div>
                    <Button onClick={saveSiteSettings} className="gap-2">
                      <Save className="w-4 h-4" /> Save Notification Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Appearance ───────────────────────────────────────────── */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Choose your preferred admin theme.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {(["light", "dark", "system"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => applyTheme(opt)}
                          className={`border rounded-lg p-4 text-center capitalize transition-colors ${
                            theme === opt
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;
