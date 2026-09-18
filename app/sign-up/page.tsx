"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampusFixLogo } from "@/components/brand/campusfix-logo";
import { ParticleDrift } from "@/components/ui/particle-drift";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SignUpPage() {
  const router = useRouter();

  const { data: session, isPending: isSessionPending } = useSession();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // If already authenticated, cleanly redirect to dashboard
  React.useEffect(() => {
    if (!isSessionPending && session?.user) {
      window.location.replace("/");
    }
  }, [session, isSessionPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please provide your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid university email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setErrorMessage(result.error.message || "Unable to create account. Please verify your details.");
        toast.error("Registration failed", {
          description: result.error.message || "Please check your details and try again.",
        });
      } else {
        toast.success("Account created successfully", {
          description: "Welcome to CampusFix. Opening operations dashboard...",
        });
        window.location.href = "/";
      }
    } catch {
      setErrorMessage("Network connection error. Please verify your connection and try again.");
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
              Create University Account
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              Register as a student or campus staff member to submit maintenance requests and follow real-time repair progress.
            </p>
          </div>

          <div className="space-y-3 pt-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Direct notification receipts on maintenance updates</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Filter and track all issues reported by your account</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>Verified university identity management and role authorization</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 text-[11px] text-muted-foreground/70 hidden lg:flex items-center justify-between">
          <span>University Facilities Operations</span>
          <span className="font-mono text-[10px]">Registration</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-background">
        <div className="w-full max-w-md mx-auto space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Register Account
            </h2>
            <p className="text-xs text-muted-foreground">
              Fill in your details to create your facilities operational account.
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
              <Label htmlFor="name" className="text-xs font-medium text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Aarav Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

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
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Must be at least 8 characters long.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground shadow-xs hover:shadow-brand-glow transition-all active:scale-98"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Operational Account"
              )}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground pt-2">
            Already registered with CampusFix?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-foreground underline underline-offset-4 hover:text-brand transition-colors"
            >
              Sign in to account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
