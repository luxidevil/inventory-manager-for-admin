import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, UserPlus, LogIn, CheckCircle2, ShoppingCart, AlertCircle } from "lucide-react";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  useEffect(() => {
    const token = params.token;
    if (!token) { setError("Invalid invite link"); setLoading(false); return; }
    fetch(`${base}/api/invite/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((e: any) => { throw new Error(e.error ?? "Invalid invite"); }))
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Invalid Invite Link</h2>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => setLocation("/login")}>Back to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.isAlreadyLinked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-lg font-semibold mb-2">Already Linked!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {data.contactName} has already joined the platform. Log in to see your purchases.
            </p>
            <Button onClick={() => setLocation("/login")}><LogIn className="h-4 w-4 mr-2" />Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
            <Package className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Bulk Inventory Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">You've been invited to join</p>
        </div>

        {/* Invite card */}
        <Card className="border-primary/30 shadow-md">
          <CardContent className="py-8 text-center space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">Hi, <span className="font-semibold text-foreground">{data.contactName}</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{data.inviterName}</span> has added you as a buyer on the platform.
              </p>
            </div>

            {data.pendingSalesCount > 0 ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
                <ShoppingCart className="h-7 w-7 mx-auto text-primary" />
                <p className="font-semibold text-lg">{data.pendingSalesCount}</p>
                <p className="text-sm text-muted-foreground">
                  {data.pendingSalesCount === 1 ? "purchase is" : "purchases are"} waiting for you
                </p>
                <Badge variant="secondary" className="text-xs">Auto-linked on sign-up</Badge>
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">No purchases yet, but you'll see them here once they're made.</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground px-2">
              Register with <strong>{data.contactEmail ?? "your email"}</strong> and your past purchases will automatically appear in your account.
            </p>
          </CardContent>
        </Card>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setLocation("/login")} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Button>
          <Button onClick={() => setLocation("/register")} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Use the same email address to claim your records automatically.
        </p>
      </div>
    </div>
  );
}
