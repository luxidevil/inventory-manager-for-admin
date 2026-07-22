import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Archive, Package, ShoppingCart, Contact,
  AlertTriangle, Bell, BookOpen, Rocket, X, ChevronLeft, ChevronRight,
} from "lucide-react";

const STEPS = [
  {
    icon: Rocket,
    title: "Welcome to Bulk Inventory Manager! 👋",
    body: "This quick walkthrough shows you how everything works — it takes under a minute. You can replay it anytime from the sidebar.",
    page: null as string | null,
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard — your control center",
    body: "See your total inventory, what's available vs sold, accounts expiring within 2 days, your revenue, and any open problem reports — all at a glance.",
    page: "/",
  },
  {
    icon: Archive,
    title: "Batches — how stock comes in",
    body: "Create a batch, then paste your account emails — even messy text works, emails are extracted automatically. Set the duration (days) and expiry dates are calculated for you. Duplicates already in inventory are always skipped.",
    page: "/batches",
  },
  {
    icon: Package,
    title: "Inventory — every account you hold",
    body: "Each email is a record with its batch, status (available / sold / reported), and days left until expiry. Filter, search, edit, or remove records here.",
    page: "/inventory",
  },
  {
    icon: ShoppingCart,
    title: "Sales — sell in seconds",
    body: "Pick a buyer (a platform user, or an external contact), select accounts, set price and duration — done. When a sale nears expiry, use Renew to extend it with a new price.",
    page: "/sales",
  },
  {
    icon: Contact,
    title: "Contacts — sell to anyone",
    body: "Your customer isn't on the platform? Add them as a contact and sell right away. Send them an invite link — when they register, all their purchases link to their account automatically.",
    page: "/contacts",
  },
  {
    icon: AlertTriangle,
    title: "Reports — dead accounts, handled fairly",
    body: "Buyers report bad accounts from a sale. The app calculates a fair pro-rata refund automatically, and you choose: refund it, or provide replacement emails (single or bulk paste). Settlements tracks the money.",
    page: "/reports",
  },
  {
    icon: Bell,
    title: "Notifications keep you posted",
    body: "New sales you received and reports on your sales show up here — plus a red badge in the sidebar so you never miss anything.",
    page: "/notifications",
  },
  {
    icon: BookOpen,
    title: "Need details? The User Guide has everything",
    body: "Every feature is documented in the User Guide (sidebar, bottom-left) — including a step-by-step first-sale walkthrough and FAQ. You can print it or save it as PDF. You're all set — happy selling! 🚀",
    page: null,
  },
];

function tourKey(userId: string) {
  return `bim_tour_done_${userId}`;
}

export function startTour() {
  window.dispatchEvent(new CustomEvent("bim-start-tour"));
}

export function OnboardingTour() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const uid = (user as any)?.id ?? user?.email ?? "";

  // Auto-open on first login for this user on this device
  useEffect(() => {
    if (!uid) return;
    if (!localStorage.getItem(tourKey(uid))) {
      setStep(0);
      setOpen(true);
    }
  }, [uid]);

  // Manual replay from the sidebar
  useEffect(() => {
    const h = () => { setStep(0); setOpen(true); };
    window.addEventListener("bim-start-tour", h);
    return () => window.removeEventListener("bim-start-tour", h);
  }, []);

  if (!open || !uid) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  function finish() {
    localStorage.setItem(tourKey(uid), "1");
    setOpen(false);
  }

  function next() {
    if (last) { finish(); return; }
    const n = step + 1;
    setStep(n);
    const page = STEPS[n].page;
    if (page) setLocation(page);
  }

  function back() {
    if (step === 0) return;
    const n = step - 1;
    setStep(n);
    const page = STEPS[n].page;
    if (page) setLocation(page);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-2xl border bg-background shadow-2xl p-6 relative">
        <button
          onClick={finish}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Skip walkthrough"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
        </div>

        <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>

        <div className="flex items-center gap-1.5 mt-5 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>Skip</Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={back}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {last ? "Finish" : "Next"} {!last && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
