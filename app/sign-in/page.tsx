"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampusFixLogo } from "@/components/brand/campusfix-logo";
import { ParticleDrift } from "@/components/ui/particle-drift";
import { Loader2, KeyRound, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const { data: session, isPending: isSessionPending } = useSession();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // If already authenticated, cleanly redirect away from sign-in
  React.useEffect(() => {
    if (!isSessionPending && session?.user) {
      window.location.replace(callbackUrl);
    }
  }, [session, isSessionPending, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your university email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setErrorMessage(
          result.error.status === 401 || result.error.message?.toLowerCase().includes("invalid")
            ? "Unable to sign in. Check your email and password and try again."
            : result.error.message || "Unable to sign in. Please verify your credentials."
        );
        toast.error("Authentication failed", {
          description: "Check your email and password and try again.",
        });
      } else {
        toast.success("Signed in successfully", {
          description: "Welcome back to CampusFix.",
        });
        window.location.href = callbackUrl;
      }
    } catch {
      setErrorMessage("Unable to communicate with the authentication service. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSessionPending && session?.user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-xs text-muted-foreground">Redirecting to operations dashboard...</p>
        </div>
      </div>
    );
  }

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:grid lg:grid-cols-12 font-sans select-none">
      {/* Left Operational Context Column with Interactive WebGL Particle Drift */}
      <div className="relative lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border/70 p-6 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden bg-muted/30">
        {/* Subtle Background Particle Drift */}
        <div className="absolute inset-0 pointer-events-auto opacity-75 dark:opacity-60">
          <ParticleDrift className="w-full h-full" density={110} speed={25} />
        </div>
        {/* Soft gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-10 space-y-6">
          <CampusFixLogo size="lg" />

          <div className="space-y-2 pt-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Campus Issue Reporting & Facilities Operations
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              A unified facilities management engine for logging infrastructure defects, dispatching repair crews, and tracking operational resolution across campus.
            </p>
          </div>

          <div className="space-y-3 pt-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Submit and track classroom, electrical, and facility repair requests</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Direct operational dispatch and technician assignment workflows</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Role-governed facilities administration and tamper-evident audit history</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 text-[11px] text-muted-foreground/70 hidden lg:flex items-center justify-between">
          <span>University Facilities Operations</span>
          <span className="font-mono text-[10px]">v2.4 Production</span>
        </div>
      </div>

      {/* Right Focused Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-background">
        <div className="w-full max-w-md mx-auto space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Sign In to CampusFix
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access operations and track issues.
            </p>
          </div>

          {errorMessage && (
            <div
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive leading-relaxed animate-fade-in"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                University Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@campusfix.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground shadow-xs hover:shadow-brand-glow transition-all active:scale-98"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In to Account"
              )}
            </Button>
          </form>

          {/* Development / Evaluation Quick Access */}
          <div className="pt-4 border-t border-border/60 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <KeyRound className="h-3 w-3 text-brand" />
              <span>Evaluation Accounts (Instant Fill):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@campusfix.local", "Admin@12345")}
                className="rounded-md border border-border/80 bg-card p-2.5 text-left hover:bg-muted/50 hover:border-brand/50 transition-colors shadow-2xs group"
              >
                <span className="block font-semibold text-foreground group-hover:text-brand transition-colors">Administrator</span>
                <span className="text-muted-foreground font-mono text-[10px]">admin@campusfix.local</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("student@campusfix.local", "Student@12345")}
                className="rounded-md border border-border/80 bg-card p-2.5 text-left hover:bg-muted/50 hover:border-brand/50 transition-colors shadow-2xs group"
              >
                <span className="block font-semibold text-foreground group-hover:text-brand transition-colors">Member (Student)</span>
                <span className="text-muted-foreground font-mono text-[10px]">student@campusfix.local</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-1">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-foreground underline underline-offset-4 hover:text-brand transition-colors"
            >
              Register new account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
