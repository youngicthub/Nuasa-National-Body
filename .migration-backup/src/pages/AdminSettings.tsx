import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import {
  BookOpen,
  FileText,
  Users,
  Upload,
  Settings as SettingsIcon,
  LogOut,
  BarChart3,
  Calendar,
  Loader2,
  User,
  Lock,
  Bell,
  Palette,
  Save,
  CreditCard,
  Eye,
  EyeOff,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { signOut, user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [siteName, setSiteName] = useState("NUASA National Body E-Library");
  const [siteTagline, setSiteTagline] = useState(
    "Empowering Nigerian accounting students with quality resources."
  );
  const [contactEmail, setContactEmail] = useState("info@nuasa.org");
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newResourceAlerts, setNewResourceAlerts] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    (localStorage.getItem("nuasa-theme") as "light" | "dark" | "system") || "system"
  );

  // Flutterwave keys
  const [flwPublicKey, setFlwPublicKey] = useState("");
  const [flwSecretKey, setFlwSecretKey] = useState("");
  const [flwEncryptionKey, setFlwEncryptionKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showEncryption, setShowEncryption] = useState(false);
  const [loadingFlw, setLoadingFlw] = useState(true);
  const [savingFlw, setSavingFlw] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "flutterwave")
        .maybeSingle();
      if (!error && data?.value) {
        const v = data.value as {
          public_key?: string;
          secret_key?: string;
          encryption_key?: string;
        };
        setFlwPublicKey(v.public_key || "");
        setFlwSecretKey(v.secret_key || "");
        setFlwEncryptionKey(v.encryption_key || "");
      }
      setLoadingFlw(false);
    })();
  }, []);

  const saveFlutterwave = async () => {
    if (!user) return;
    setSavingFlw(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        key: "flutterwave",
        value: {
          public_key: flwPublicKey.trim(),
          secret_key: flwSecretKey.trim(),
          encryption_key: flwEncryptionKey.trim(),
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });
    setSavingFlw(false);
    if (error) return toast.error(error.message);
    toast.success("Flutterwave keys saved");
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setInstitution(profile.institution || "");
      setAcademicLevel(profile.academic_level || "");
    }
  }, [profile]);

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

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        institution: institution || null,
        academic_level: academicLevel || null,
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile updated");
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const saveSiteSettings = () => {
    localStorage.setItem(
      "nuasa-site-settings",
      JSON.stringify({
        siteName,
        siteTagline,
        contactEmail,
        allowRegistrations,
        maintenanceMode,
        emailNotifications,
        newResourceAlerts,
      })
    );
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your profile, security, site preferences and notifications.
              </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6">
                <TabsTrigger value="profile" className="gap-2">
                  <User className="w-4 h-4" /> Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Lock className="w-4 h-4" /> Security
                </TabsTrigger>
                <TabsTrigger value="site" className="gap-2">
                  <SettingsIcon className="w-4 h-4" /> Site
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <CreditCard className="w-4 h-4" /> Payments
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" /> Alerts
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-2">
                  <Palette className="w-4 h-4" /> Theme
                </TabsTrigger>
              </TabsList>

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

              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Flutterwave Payments</CardTitle>
                    <CardDescription>
                      Enter your Flutterwave API keys. They are stored securely and used by the
                      backend to process convention registrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingFlw ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label>Public Key</Label>
                          <Input
                            placeholder="FLWPUBK-..."
                            value={flwPublicKey}
                            onChange={(e) => setFlwPublicKey(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Used on the checkout page. Safe to expose to browsers.
                          </p>
                        </div>
                        <div>
                          <Label>Secret Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type={showSecret ? "text" : "password"}
                              placeholder="FLWSECK-..."
                              value={flwSecretKey}
                              onChange={(e) => setFlwSecretKey(e.target.value)}
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
                            Used by backend functions only. Never exposed to the browser.
                          </p>
                        </div>
                        <div>
                          <Label>Encryption Key (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              type={showEncryption ? "text" : "password"}
                              placeholder="FLWSECK_TEST..."
                              value={flwEncryptionKey}
                              onChange={(e) => setFlwEncryptionKey(e.target.value)}
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
                        <Button onClick={saveFlutterwave} disabled={savingFlw} className="gap-2">
                          {savingFlw ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Flutterwave Keys
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

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