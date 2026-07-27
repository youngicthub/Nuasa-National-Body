import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Globe, Users, BookOpen, FileText, Calendar, Ticket, Receipt,
  Upload, Settings, LogOut, Shield, ChevronRight, UserCog,
} from "lucide-react";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import { useAuth } from "@/contexts/AuthContext";

type Item = { to: string; label: string; icon: any };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
      { to: "/admin/visitors", label: "Visitors", icon: Globe },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/chapters", label: "Chapters", icon: Shield },
      { to: "/admin/executives", label: "Executives", icon: UserCog },
      { to: "/admin/convention", label: "Convention", icon: Ticket },
      { to: "/admin/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/resources", label: "E-Library", icon: BookOpen },
      { to: "/admin/posts", label: "Blog Posts", icon: FileText },
      { to: "/admin/events", label: "Events", icon: Calendar },
      { to: "/admin/resources/new", label: "Upload Resource", icon: Upload },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const AdminSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const isActive = (to: string) =>
    pathname === to || (to !== "/admin/dashboard" && pathname.startsWith(to));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 bg-primary h-screen fixed left-0 top-0 flex flex-col border-r border-primary-foreground/10"
    >
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-primary-foreground/10">
        <img
          src={nuasaLogo}
          alt="NUASA"
          className="w-10 h-10 rounded-lg object-cover ring-1 ring-accent/40"
        />
        <div className="flex flex-col">
          <span className="font-serif font-bold text-base text-primary-foreground leading-tight tracking-wide">
            NUASA
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-accent/90 leading-tight">
            Admin Console
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to} className="relative">
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" />
                    )}
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 pl-4 pr-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-primary-foreground/10 text-primary-foreground font-medium"
                          : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-accent" : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-primary-foreground/10 p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold">
            {(profile?.full_name || user?.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-primary-foreground truncate">
              {profile?.full_name || "Administrator"}
            </span>
            <span className="text-[10px] text-primary-foreground/50 truncate">
              {user?.email}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-primary-foreground/80 bg-primary-foreground/5 hover:bg-destructive/15 hover:text-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </motion.aside>
  );
};

export default AdminSidebar;