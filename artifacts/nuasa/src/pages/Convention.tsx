import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Printer, CheckCircle2, Calendar, MapPin, Users, Download, PartyPopper, LogIn } from "lucide-react";
import jsPDF from "jspdf";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const PRICES = { student: 20000, graduate: 30000, chapter: 50000 } as const;
const LABELS = { student: "Student", graduate: "Graduates", chapter: "Chapter" } as const;

const BREAKOUT_SESSIONS = [
  "Investment Banking & Capital Markets",
  "Taxation & Revenue Administration",
  "Audit, Risk & Fiscal Governance",
  "Consulting & Business Advisory",
  "Data Analytics, Technology & Digital Finance",
] as const;

// Student discount window — active through end of July 2026
const STUDENT_DISCOUNT_PRICE = 15000;
const DISCOUNT_START = new Date("2026-06-16T00:00:00Z");
const DISCOUNT_END = new Date("2026-07-31T23:59:59Z");

type DelegateDetails = { name: string; phone: string; email: string };
type DelegateField = keyof DelegateDetails;

const DELEGATE_NAME_REGEX = /^[\p{L}\p{M}.' -]+$/u;

const formatDelegateNameInput = (value: string) =>
  value
    .replace(/[^\p{L}\p{M}.' -]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trimStart()
    .slice(0, 100);

const normalizeDelegateName = (value: string) => value.trim().replace(/\s+/g, " ");
const normalizeDelegateEmail = (value: string) => value.trim().toLowerCase().slice(0, 254);

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
};

const formatPhoneInput = (value: string) => {
  const hasPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, 15);
  return `${hasPlus ? "+" : ""}${digits}`;
};

const formatPhoneForDisplay = (value: string) => {
  const phone = normalizePhoneNumber(value);
  if (!phone) return value.trim();
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+234") && digits.length === 13) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
};

const delegateSchema = z.object({
  name: z
    .string()
    .transform(normalizeDelegateName)
    .refine((value) => value.length >= 2 && value.length <= 100 && DELEGATE_NAME_REGEX.test(value), {
      message: "Enter a valid full name",
    }),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhoneNumber(value);
    if (!phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid phone number" });
      return z.NEVER;
    }
    return phone;
  }),
  email: z
    .string()
    .transform(normalizeDelegateEmail)
    .pipe(z.string().email("Enter a valid email address").max(254, "Email is too long")),
});

const delegatesSchema = z.array(delegateSchema).length(2).superRefine((delegates, ctx) => {
  if (new Set(delegates.map((d) => d.email)).size !== delegates.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [1, "email"], message: "Delegate emails must be different" });
  }
  if (new Set(delegates.map((d) => d.phone)).size !== delegates.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [1, "phone"], message: "Delegate phone numbers must be different" });
  }
});

function getCountdown(target: Date, now: Date) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: diff === 0 };
}

declare global { interface Window { FlutterwaveCheckout?: any } }

const loadFlutterwave = () =>
  new Promise<void>((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Flutterwave"));
    document.body.appendChild(s);
  });

const Convention = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [type, setType] = useState<"student" | "graduate" | "chapter">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [delegatesCount, setDelegatesCount] = useState(2);
  const [delegate1, setDelegate1] = useState({ name: "", phone: "", email: "" });
  const [delegate2, setDelegate2] = useState({ name: "", phone: "", email: "" });
  const [delegateErrors, setDelegateErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [accommodation, setAccommodation] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [breakoutSession, setBreakoutSession] = useState<string>("");
  const [now, setNow] = useState(() => new Date());
  const [localExtras, setLocalExtras] = useState<Record<string, { delegates: any[]; breakoutSession: string | null }>>({});
  const [successReg, setSuccessReg] = useState<{ name: string; refCode: string; amount: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setInstitution(profile.institution || "");
    }
  }, [profile]);

  useEffect(() => {
    supabase.functions.invoke("convention-public-config").then(({ data }) => {
      if (data?.public_key) setPublicKey(data.public_key);
    });
  }, []);

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["my-convention-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("convention_registrations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const discountActive = type === "student" && now >= DISCOUNT_START && now <= DISCOUNT_END;
  const basePrice = PRICES[type];
  const amount = discountActive ? STUDENT_DISCOUNT_PRICE : basePrice;
  const discountUpcoming = type === "student" && now < DISCOUNT_START;
  const countdown = getCountdown(DISCOUNT_START, now);

  const updateDelegate = (idx: number, field: DelegateField, value: string) => {
    const formattedValue =
      field === "name" ? formatDelegateNameInput(value) :
      field === "phone" ? formatPhoneInput(value) :
      normalizeDelegateEmail(value);
    const setter = idx === 1 ? setDelegate1 : setDelegate2;
    setter((current) => ({ ...current, [field]: formattedValue }));
    setDelegateErrors((current) => {
      const next = { ...current };
      delete next[`${idx}.${field}`];
      return next;
    });
  };

  const formatDelegateOnBlur = (idx: number, field: DelegateField, value: string) => {
    const formattedValue =
      field === "name" ? normalizeDelegateName(value) :
      field === "phone" ? formatPhoneForDisplay(value) :
      normalizeDelegateEmail(value);
    const setter = idx === 1 ? setDelegate1 : setDelegate2;
    setter((current) => ({ ...current, [field]: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (!publicKey) { toast.error("Payments not configured. Please contact admin."); return; }
    if (!fullName || !email || !phone) { toast.error("Please fill all required fields"); return; }
    if (type === "student" && !breakoutSession) { toast.error("Please select a breakout session"); return; }
    let chapterDelegates: DelegateDetails[] | null = null;
    if (type === "chapter") {
      if (!chapterName) { toast.error("Please enter the chapter name"); return; }
      const parsedDelegates = delegatesSchema.safeParse([delegate1, delegate2]);
      if (!parsedDelegates.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsedDelegates.error.issues) {
          const [delegateIndex, field] = issue.path;
          if (typeof delegateIndex === "number" && typeof field === "string") {
            errors[`${delegateIndex + 1}.${field}`] = issue.message;
          }
        }
        setDelegateErrors(errors);
        toast.error(parsedDelegates.error.issues[0]?.message || "Please enter valid delegate details");
        return;
      }
      setDelegateErrors({});
      chapterDelegates = parsedDelegates.data as DelegateDetails[];
    }

    setSubmitting(true);
    try {
      const tx_ref = `NUASA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reference_code = `NUASA-${type.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const insertPayload: any = {
        user_id: user.id,
        registration_type: type,
        full_name: fullName,
        email,
        phone,
        institution: institution || null,
        chapter_name: type === "chapter" ? chapterName : null,
        delegates_count: type === "chapter" ? 2 : 1,
        amount,
        tx_ref,
        reference_code,
        notes: notes || null,
        breakout_session: type === "student" ? breakoutSession || null : null,
        gender: gender || null,
        department: department || null,
        matric_number: matricNumber || null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        accommodation_request: accommodation || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
      };
      const { error: insErr } = await supabase.from("convention_registrations").insert(insertPayload);
      if (insErr) throw insErr;

      setLocalExtras(prev => ({
        ...prev,
        [tx_ref]: {
          delegates: chapterDelegates,
          breakoutSession: type === "student" ? breakoutSession : null,
        },
      }));

      await loadFlutterwave();
      window.FlutterwaveCheckout({
        public_key: publicKey,
        tx_ref,
        amount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: { email, phone_number: phone, name: fullName },
        customizations: {
          title: "NUASA National Convention",
          description: `${LABELS[type]} Registration`,
        },
        callback: async (resp: any) => {
          try {
            const { data } = await supabase.functions.invoke("convention-verify-payment", {
              body: { transaction_id: resp.transaction_id, tx_ref },
            });
            if (data?.success) {
              toast.success("Payment confirmed! Your registration is complete.");
              setSuccessReg({ name: fullName, refCode: reference_code, amount });
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else toast.error("Payment could not be verified.");
          } catch (err: any) { toast.error(err.message); }
          qc.invalidateQueries({ queryKey: ["my-convention-regs"] });
        },
        onclose: () => qc.invalidateQueries({ queryKey: ["my-convention-regs"] }),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start payment");
    } finally {
      setSubmitting(false);
    }
  };

  const printTicket = (r: any) => {
    const extras = localExtras[r.tx_ref] || {};
    const delegates: any[] = extras.delegates || [];
    const breakout: string | null = r.breakout_session || extras.breakoutSession || null;
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const row = (label: string, val: any) =>
      val ? `<div class="row"><span>${label}</span><strong>${val}</strong></div>` : "";
    const created = r.created_at ? new Date(r.created_at).toLocaleString() : "";
    const delegatesHtml = delegates.length
      ? `<h3>Delegates</h3>${delegates.map((d: any, i: number) =>
          `<div style="margin-bottom:8px;padding:8px 0;border-bottom:1px dotted #e5e5e5"><strong style="color:#006837">Delegate ${i + 1}</strong>${row("Name", d.name)}${row("Email", d.email)}${row("Phone", d.phone)}</div>`
        ).join("")}`
      : "";
    const html = `
      <div class="ticket">
        <div class="head">
          <h1>NUASA National Convention</h1>
          <div class="sub">Official Registration Receipt</div>
        </div>
        <div class="meta">
          <span class="badge">${(r.payment_status || "").toUpperCase()}</span>
          <span class="cat">${LABELS[r.registration_type as keyof typeof LABELS] || r.registration_type}</span>
        </div>
        <div class="ref">${r.reference_code}</div>
        <h3>Attendee</h3>
        ${row("Full Name", r.full_name)}
        ${row("Email", r.email)}
        ${row("Phone", r.phone)}
        ${row("Gender", r.gender)}
        ${row("Institution", r.institution)}
        ${row("Department", r.department)}
        ${row("Matric Number", r.matric_number)}
        ${row("Graduation Year", r.graduation_year)}
        ${breakout ? row("Breakout Session", breakout) : ""}
        ${r.chapter_name ? `<h3>Chapter</h3>${row("Chapter Name", r.chapter_name)}${row("No. of Delegates", r.delegates_count)}` : ""}
        ${delegatesHtml}
        <h3>Logistics</h3>
        ${row("Accommodation", r.accommodation_request)}
        ${row("Emergency Contact", r.emergency_contact_name)}
        ${row("Emergency Phone", r.emergency_contact_phone)}
        ${r.notes ? `${row("Notes", r.notes)}` : ""}
        <h3>Payment</h3>
        ${row("Category", LABELS[r.registration_type as keyof typeof LABELS])}
        ${row("Amount Paid", `₦${Number(r.amount).toLocaleString()} ${r.currency || "NGN"}`)}
        ${row("Transaction Ref", r.tx_ref)}
        ${row("Flutterwave ID", r.flw_transaction_id)}
        ${row("Registered On", created)}
        <div class="foot">
          <p>Please present this receipt at the convention check-in. Keep your reference code safe — it is your unique identifier for this event.</p>
          <p class="thanks">Thank you for registering. We look forward to hosting you.</p>
        </div>
      </div>`;
    w.document.write(`<!doctype html><html><head><title>NUASA Convention Receipt — ${r.reference_code}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Georgia,'Times New Roman',serif;padding:32px;color:#0a0a0a;background:#f4f4f4;margin:0}
        .ticket{background:#fff;border:1px solid #006837;border-top:6px solid #006837;border-radius:14px;padding:36px;max-width:680px;margin:auto;box-shadow:0 6px 18px rgba(0,0,0,.06)}
        .head{text-align:center;border-bottom:1px dashed #ccc;padding-bottom:14px;margin-bottom:14px}
        h1{color:#006837;margin:0;font-size:24px;letter-spacing:.5px}
        .sub{color:#666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px}
        .meta{display:flex;justify-content:space-between;align-items:center;margin:14px 0}
        .badge{background:#006837;color:#fff;padding:5px 14px;border-radius:999px;font-size:11px;letter-spacing:1.5px;font-family:Arial,sans-serif}
        .cat{font-size:13px;color:#444;font-style:italic}
        .ref{font-family:'Courier New',monospace;font-size:22px;letter-spacing:4px;background:#f5f5f5;border:1px dashed #006837;padding:14px;border-radius:8px;text-align:center;margin:18px 0;color:#006837;font-weight:bold}
        h3{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#006837;border-bottom:1px solid #e5e5e5;padding-bottom:4px;margin:18px 0 8px}
        .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dotted #e5e5e5;font-size:13px}
        .row span{color:#666}
        .row strong{color:#0a0a0a;text-align:right;max-width:60%;word-break:break-word}
        .foot{margin-top:24px;padding-top:14px;border-top:1px dashed #ccc;font-size:11px;color:#666;text-align:center;line-height:1.5}
        .thanks{margin-top:8px;color:#006837;font-style:italic}
        @media print{body{background:#fff;padding:0}.ticket{box-shadow:none;border-radius:0}}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  const downloadReceiptPDF = (r: any) => {
    const extras = localExtras[r.tx_ref] || {};
    const delegates: any[] = extras.delegates || [];
    const breakout: string | null = r.breakout_session || extras.breakoutSession || null;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    let y = 50;
    doc.setFillColor(0, 104, 55);
    doc.rect(0, 0, W, 8, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 104, 55);
    doc.text("NUASA National Convention", W / 2, y, { align: "center" });
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("OFFICIAL REGISTRATION RECEIPT", W / 2, y, { align: "center" });
    y += 24;
    doc.setDrawColor(0, 104, 55);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(40, y, W - 40, y);
    y += 24;
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 104, 55);
    doc.text(r.reference_code || "", W / 2, y, { align: "center" });
    y += 10;
    doc.setLineDashPattern([], 0);

    const section = (title: string) => {
      y += 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 104, 55);
      doc.text(title.toUpperCase(), 40, y);
      doc.setDrawColor(220);
      doc.line(40, y + 4, W - 40, y + 4);
      y += 14;
    };
    const row = (k: string, v: any) => {
      if (!v && v !== 0) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110);
      doc.text(k, 50, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20);
      const text = String(v);
      const split = doc.splitTextToSize(text, 280);
      doc.text(split, W - 50, y, { align: "right" });
      y += Math.max(14, split.length * 12);
    };

    section("Attendee");
    row("Full Name", r.full_name);
    row("Email", r.email);
    row("Phone", r.phone);
    row("Gender", r.gender);
    row("Institution", r.institution);
    row("Department", r.department);
    row("Matric Number", r.matric_number);
    row("Graduation Year", r.graduation_year);

    if (breakout) row("Breakout Session", breakout);

    if (r.chapter_name) {
      section("Chapter");
      row("Chapter Name", r.chapter_name);
      row("No. of Delegates", r.delegates_count);
    }

    if (delegates.length > 0) {
      section("Delegates");
      delegates.forEach((d: any, i: number) => {
        row(`Delegate ${i + 1} Name`, d.name);
        row(`Delegate ${i + 1} Email`, d.email);
        row(`Delegate ${i + 1} Phone`, d.phone);
      });
    }

    section("Logistics");
    row("Accommodation", r.accommodation_request);
    row("Emergency Contact", r.emergency_contact_name);
    row("Emergency Phone", r.emergency_contact_phone);
    if (r.notes) row("Convention Expectations & Allergies", r.notes);

    section("Payment");
    row("Category", LABELS[r.registration_type as keyof typeof LABELS]);
    row("Amount Paid", `₦${Number(r.amount).toLocaleString()}`);
    row("Status", (r.payment_status || "").toUpperCase());
    row("Transaction Ref", r.tx_ref);
    row("Flutterwave ID", r.flw_transaction_id);
    row("Registered On", r.created_at ? new Date(r.created_at).toLocaleString() : "");

    y += 24;
    doc.setDrawColor(0, 104, 55);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(40, y, W - 40, y);
    y += 16;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const foot = "Please present this receipt at the convention check-in. Keep your reference code safe — it is your unique identifier for this event.";
    doc.text(doc.splitTextToSize(foot, W - 80), W / 2, y, { align: "center" });

    doc.save(`NUASA-Receipt-${r.reference_code || r.id}.pdf`);
  };

  return (
    <Layout>
      <SEO title="NUASA National Convention — Register" description="Register for the upcoming NUASA National Convention. Students, graduates, and chapters can register and pay online with Flutterwave." path="/convention" />
      <section className="bg-primary text-primary-foreground py-16">
        <div className="content-container">
          <Badge className="bg-accent text-accent-foreground mb-4">COMING SOON</Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">NUASA National Convention</h1>
          <p className="text-primary-foreground/80 max-w-2xl mb-6">The premier annual gathering of accounting students across Nigeria. Register as a Student, Graduate or Other attendee, or Chapter and secure your slot today.</p>
          <div className="flex flex-wrap gap-6 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> Dates to be announced</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> Venue to be announced</span>
            <span className="flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Nationwide attendance</span>
          </div>
        </div>
      </section>

      {successReg && (
        <div className="content-container pt-8">
          <div className="rounded-2xl border-2 border-accent bg-accent/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
              <PartyPopper className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-lg font-bold text-accent mb-1">Registration Successful! 🎉</h3>
              <p className="text-sm text-foreground/80">
                <strong>{successReg.name}</strong>, you're registered for the NUASA National Convention.
                Your reference code is <strong className="font-mono text-accent">{successReg.refCode}</strong>.
                Amount paid: <strong>₦{successReg.amount.toLocaleString()}</strong>.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Download or print your receipt below. Keep your reference code — you'll need it at check-in.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSuccessReg(null)} className="shrink-0">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <section className="content-container py-12 grid lg:grid-cols-[1fr_400px] gap-8">
        <Card className="p-6">
          <h2 className="font-serif text-2xl font-bold mb-1">Register</h2>
          <p className="text-sm text-muted-foreground mb-6">Choose your registration type and complete payment via Flutterwave.</p>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-1">Sign in to register</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  You need a NUASA account to register for the convention. Sign in or create a free account to continue.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/login?redirect=/convention">Sign in</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/register?redirect=/convention">Create account</Link>
                </Button>
              </div>
            </div>
          ) : registrations?.some((r) => r.payment_status === "successful") ? (
            <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-1 text-accent">You're already registered!</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  You have an active registration for the NUASA National Convention. You cannot register again.
                </p>
              </div>
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/dashboard/convention">View My Registration</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="mb-2 block">Registration Type</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="grid sm:grid-cols-3 gap-3">
                  {(["student", "graduate", "chapter"] as const).map((t) => (
                    <label key={t} htmlFor={`t-${t}`} className={`border rounded-xl p-4 cursor-pointer transition-colors ${type === t ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                      <RadioGroupItem id={`t-${t}`} value={t} className="sr-only" />
                      <div className="font-medium">{LABELS[t]}</div>
                      <div className="text-2xl font-bold mt-1">₦{PRICES[t].toLocaleString()}</div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {type === "student" && (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  {discountActive ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold text-accent">Student Discount Active — ₦15,000</div>
                        <div className="text-xs text-muted-foreground">Ends {DISCOUNT_END.toUTCString()}</div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">SAVE ₦5,000</Badge>
                    </div>
                  ) : discountUpcoming ? (
                    <div>
                      <div className="font-semibold mb-2">Student Discount starts in</div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Days", value: countdown.days },
                          { label: "Hours", value: countdown.hours },
                          { label: "Min", value: countdown.minutes },
                          { label: "Sec", value: countdown.seconds },
                        ].map((b) => (
                          <div key={b.label} className="bg-background rounded-lg py-2 border">
                            <div className="text-2xl font-bold tabular-nums">{String(b.value).padStart(2, "0")}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Student registration at ₦15,000 (was ₦20,000) until 31 July 2026.
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Student discount has ended. Standard pricing applies.</div>
                  )}
                </div>
              )}

              {type === "student" && (
                <div>
                  <Label className="mb-2 block">Breakout Session *</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Please select ONE breakout session you would like to attend. Session allocation will be based on capacity and availability.
                  </p>
                  <RadioGroup value={breakoutSession} onValueChange={setBreakoutSession} className="grid gap-2">
                    {BREAKOUT_SESSIONS.map((s) => (
                      <label
                        key={s}
                        htmlFor={`bs-${s}`}
                        className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                          breakoutSession === s ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                        }`}
                      >
                        <RadioGroupItem id={`bs-${s}`} value={s} />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
                <div><Label>Institution</Label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
                <div>
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Accounting" /></div>
                {type === "student" && (
                  <>
                    <div><Label>Matric Number</Label><Input value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)} /></div>
                    <div><Label>Expected Graduation Year</Label><Input type="number" min={2024} max={2035} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} /></div>
                  </>
                )}
                {type === "graduate" && (
                  <div><Label>Graduation Year</Label><Input type="number" min={1970} max={2030} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} /></div>
                )}
              </div>

              {type === "chapter" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><Label>Chapter Name *</Label><Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} required /></div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <h3 className="font-semibold mb-1">Chapter Delegates</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Each chapter registration covers <strong>two delegates</strong>. Please provide their details below.
                    </p>
                    {[
                      { idx: 1, value: delegate1 },
                      { idx: 2, value: delegate2 },
                    ].map(({ idx, value }) => (
                      <div key={idx} className="mb-4 last:mb-0">
                        <div className="text-sm font-medium mb-2">Delegate {idx}</div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Full Name *</Label>
                            <Input
                              value={value.name}
                              onChange={(e) => updateDelegate(idx, "name", e.target.value)}
                              onBlur={(e) => formatDelegateOnBlur(idx, "name", e.target.value)}
                              aria-invalid={!!delegateErrors[`${idx}.name`]}
                              maxLength={100}
                              required
                            />
                            {delegateErrors[`${idx}.name`] && <p className="mt-1 text-xs text-destructive">{delegateErrors[`${idx}.name`]}</p>}
                          </div>
                          <div>
                            <Label className="text-xs">Phone *</Label>
                            <Input
                              type="tel"
                              inputMode="tel"
                              value={value.phone}
                              onChange={(e) => updateDelegate(idx, "phone", e.target.value)}
                              onBlur={(e) => formatDelegateOnBlur(idx, "phone", e.target.value)}
                              aria-invalid={!!delegateErrors[`${idx}.phone`]}
                              placeholder="08012345678"
                              maxLength={19}
                              required
                            />
                            {delegateErrors[`${idx}.phone`] && <p className="mt-1 text-xs text-destructive">{delegateErrors[`${idx}.phone`]}</p>}
                          </div>
                          <div>
                            <Label className="text-xs">Email *</Label>
                            <Input
                              type="email"
                              inputMode="email"
                              autoCapitalize="none"
                              value={value.email}
                              onChange={(e) => updateDelegate(idx, "email", e.target.value)}
                              onBlur={(e) => formatDelegateOnBlur(idx, "email", e.target.value)}
                              aria-invalid={!!delegateErrors[`${idx}.email`]}
                              maxLength={254}
                              required
                            />
                            {delegateErrors[`${idx}.email`] && <p className="mt-1 text-xs text-destructive">{delegateErrors[`${idx}.email`]}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="sm:col-span-2">
                  <Label>Accommodation Request</Label>
                  <Select value={accommodation} onValueChange={setAccommodation}>
                    <SelectTrigger><SelectValue placeholder="Do you need accommodation?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No, I'll arrange my own</SelectItem>
                      <SelectItem value="shared">Yes — shared room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Emergency Contact Name</Label><Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} /></div>
                <div><Label>Emergency Contact Phone</Label><Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} /></div>
              </div>

              <div><Label>Convention Expectations and Allergies (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any dietary requirements, allergies, accessibility needs, or expectations for the convention…" /></div>

              <div className="flex items-center justify-between bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">
                  Total payable
                  {discountActive && <div className="text-xs text-accent">Student discount applied — ₦15,000</div>}
                </div>
                <div className="text-right">
                  {discountActive && (
                    <div className="text-sm text-muted-foreground line-through">₦{basePrice.toLocaleString()}</div>
                  )}
                  <div className="text-2xl font-bold">₦{amount.toLocaleString()}</div>
                </div>
              </div>

              <Button type="submit" disabled={submitting} size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₦${amount.toLocaleString()} with Flutterwave`}
              </Button>
            </form>
          )}
        </Card>

        <div>
          <h3 className="font-serif text-xl font-bold mb-4">My Registrations</h3>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !registrations?.length ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <div className="space-y-4">
              {registrations.map((r) => (
                <Card key={r.id} className="p-4">
                  <div id={`ticket-${r.id}`}>
                    <div className="ticket">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h1 className="font-serif text-lg font-bold text-primary">NUASA National Convention</h1>
                          <div className="text-xs text-muted-foreground">{LABELS[r.registration_type as keyof typeof LABELS]} Registration</div>
                        </div>
                        <span className={`badge text-xs px-2 py-1 rounded-full font-semibold ${r.payment_status === "successful" ? "bg-accent text-accent-foreground" : r.payment_status === "pending" ? "bg-muted text-muted-foreground" : "bg-destructive text-destructive-foreground"}`}>
                          {r.payment_status}
                        </span>
                      </div>
                      <div className="mb-1 text-[10px] text-center font-medium uppercase tracking-widest text-muted-foreground">Registration ID</div>
                      <div className="ref font-mono text-center bg-muted rounded-md py-2 my-1 tracking-widest text-sm font-bold">{r.reference_code}</div>
                      <div className="text-sm space-y-1 mt-3">
                        <div className="row flex justify-between border-b border-dashed py-1"><span className="text-muted-foreground">Name</span><strong>{r.full_name}</strong></div>
                        <div className="row flex justify-between border-b border-dashed py-1"><span className="text-muted-foreground">Email</span><span className="text-right truncate max-w-[55%]">{r.email}</span></div>
                        <div className="row flex justify-between border-b border-dashed py-1"><span className="text-muted-foreground">Phone</span><span>{r.phone}</span></div>
                        {r.chapter_name && <div className="row flex justify-between border-b border-dashed py-1"><span className="text-muted-foreground">Chapter</span><span>{r.chapter_name}</span></div>}
                        {r.breakout_session && (
                          <div className="row flex justify-between border-b border-dashed py-1 gap-2">
                            <span className="text-muted-foreground shrink-0">Breakout Session</span>
                            <span className="text-right text-accent font-medium">{r.breakout_session}</span>
                          </div>
                        )}
                        {/* Amount intentionally hidden — only category shown */}
                      </div>
                    </div>
                  </div>
                  {r.payment_status === "successful" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button onClick={() => printTicket(r)} variant="outline" size="sm" className="gap-2">
                        <Printer className="w-4 h-4" /> Print
                      </Button>
                      <Button onClick={() => downloadReceiptPDF(r)} size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Download className="w-4 h-4" /> PDF
                      </Button>
                    </div>
                  )}
                  {r.payment_status === "successful" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-accent justify-center"><CheckCircle2 className="w-3 h-3" /> Confirmed</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Convention;