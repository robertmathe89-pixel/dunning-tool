"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import {
  CreditCard,
  Mail,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Send,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Steps:
// 0 = Auth (email + magic link)
// 1 = Stripe
// 2 = Email SMTP
// 3 = Simulate / Preview

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Wizard step (0-indexed, display shows +1)
  const [step, setStep] = useState(0);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Step 0: Auth
  const [authEmail, setAuthEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [authError, setAuthError] = useState("");

  // Step 1: Stripe
  const [stripeKey, setStripeKey] = useState("");
  const [stripeStatus, setStripeStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [stripeError, setStripeError] = useState("");

  // Step 2: Email
  const [companyName, setCompanyName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpPass, setSmtpPass] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  // Step 3: Simulate
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // On mount: check if user is already authenticated
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setStep(1); // Skip auth step
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [supabase]);

  // ---------------------------------------------------------------------------
  // Step 0: Send magic link
  // ---------------------------------------------------------------------------
  const sendMagicLink = async () => {
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      setAuthStatus("error");
      return;
    }

    setAuthStatus("sending");
    setAuthError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      console.error("[ONBOARDING] Magic link error:", error);
      setAuthError(error.message);
      setAuthStatus("error");
    } else {
      setAuthStatus("sent");
    }
  };

  // ---------------------------------------------------------------------------
  // Step 1: Validate Stripe key (calls our API)
  // ---------------------------------------------------------------------------
  const validateStripe = async () => {
    if (!stripeKey.startsWith("sk_")) {
      setStripeError("Stripe secret keys start with 'sk_'");
      setStripeStatus("error");
      return;
    }

    setStripeStatus("validating");
    setStripeError("");

    try {
      const res = await fetch("/api/stripe/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: stripeKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStripeError(data.details || data.error || "Validation failed");
        setStripeStatus("error");
        return;
      }

      setStripeStatus("success");
      setTimeout(() => setStep(2), 800);
    } catch (err: any) {
      setStripeError(err.message || "Network error");
      setStripeStatus("error");
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2: Test email SMTP (calls our API)
  // ---------------------------------------------------------------------------
  const testEmailConnection = async () => {
    if (!senderEmail || !senderEmail.includes("@")) {
      setEmailError("Please enter a valid sender email.");
      setEmailStatus("error");
      return;
    }

    setEmailStatus("testing");
    setEmailError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || undefined,
          sender_name: senderName || undefined,
          sender_email: senderEmail,
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort, 10),
          smtp_user: senderEmail,
          smtp_pass: smtpPass || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.details || data.error || "Failed to save settings");
        setEmailStatus("error");
        return;
      }

      setEmailStatus("success");
      setTimeout(() => setStep(3), 800);
    } catch (err: any) {
      setEmailError(err.message || "Network error");
      setEmailStatus("error");
    }
  };

  // ---------------------------------------------------------------------------
  // Step 3: Finish — save everything and go to dashboard
  // ---------------------------------------------------------------------------
  const finish = async () => {
    setSaving(true);

    // If they skipped Stripe validation but entered a key, try to save it
    if (stripeKey && stripeStatus !== "success") {
      try {
        await fetch("/api/stripe/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: stripeKey }),
        });
      } catch {
        // Best effort — don't block on this
      }
    }

    setSaving(false);
    router.push("/dashboard");
  };

  // ---------------------------------------------------------------------------
  // Skip helper
  // ---------------------------------------------------------------------------
  const skipStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state while checking auth
  // ---------------------------------------------------------------------------
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-[#111118] border-[#22222E]">
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin mb-4" />
            <p className="text-[#8A8A9E]">Checking your session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Wizard display step (1-4 for progress bar, internal is 0-3)
  // ---------------------------------------------------------------------------
  const displayStep = step + (user ? 1 : 0); // if user exists, step 0 is hidden
  const totalSteps = user ? 3 : 4;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#111118] border-[#22222E]">
        <CardContent className="p-8">
          {/* Progress */}
          <ProgressIndicator currentStep={displayStep} totalSteps={totalSteps} />

          {/* =====================================================================
              STEP 0: AUTH (only shown if not authenticated)
             ===================================================================== */}
          {step === 0 && !user && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Let&apos;s get you set up
                </h2>
                <p className="text-[#8A8A9E]">
                  Enter your email and we&apos;ll send you a magic link to sign in. No password needed.
                </p>
              </div>

              <div className="space-y-4">
                {authStatus !== "sent" ? (
                  <>
                    <div>
                      <label className="text-sm text-[#8A8A9E] mb-2 block">
                        Your Email
                      </label>
                      <Input
                        type="email"
                        placeholder="founder@yourcompany.com"
                        value={authEmail}
                        onChange={(e) => {
                          setAuthEmail(e.target.value);
                          if (authStatus === "error") setAuthStatus("idle");
                        }}
                        className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                      />
                    </div>

                    <Button
                      onClick={sendMagicLink}
                      disabled={!authEmail || authStatus === "sending"}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold py-6 transition-all duration-200"
                    >
                      {authStatus === "sending" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Magic Link
                        </>
                      )}
                    </Button>

                    {authStatus === "error" && authError && (
                      <div className="flex items-center gap-2 text-[#EF4444] justify-center text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{authError}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Check your email
                    </h3>
                    <p className="text-[#8A8A9E]">
                      We sent a magic link to <strong className="text-white">{authEmail}</strong>.<br />
                      Click the link in the email to continue.
                    </p>
                    <p className="text-xs text-[#5A5A6E]">
                      Didn&apos;t receive it? Check your spam folder or{" "}
                      <button
                        onClick={() => setAuthStatus("idle")}
                        className="text-[#F59E0B] hover:underline"
                      >
                        try again
                      </button>
                      .
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              STEP 1: STRIPE
             ===================================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-[#8B5CF6]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connect Your Stripe Account
                </h2>
                <p className="text-[#8A8A9E]">
                  Paste your Stripe API key so we can listen for failed payments in real-time.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Stripe Secret Key
                  </label>
                  <Input
                    type="password"
                    placeholder="sk_test_... or sk_live_..."
                    value={stripeKey}
                    onChange={(e) => {
                      setStripeKey(e.target.value);
                      if (stripeStatus === "error") setStripeStatus("idle");
                    }}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>

                <Button
                  onClick={validateStripe}
                  disabled={!stripeKey || stripeStatus === "validating"}
                  className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold py-6 transition-all duration-200"
                >
                  {stripeStatus === "validating" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Validate & Connect"
                  )}
                </Button>

                {stripeStatus === "success" && (
                  <div className="flex items-center gap-2 text-[#10B981] justify-center">
                    <Check className="w-5 h-5" />
                    <span>Stripe connected!</span>
                  </div>
                )}
                {stripeStatus === "error" && stripeError && (
                  <div className="flex items-center gap-2 text-[#EF4444] justify-center text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{stripeError}</span>
                  </div>
                )}

                <p className="text-xs text-[#5A5A6E] text-center">
                  Your key is encrypted and never shared.{" "}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F59E0B] hover:underline"
                  >
                    Find it in Stripe Dashboard →
                  </a>
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={skipStep}
                  className="text-[#8A8A9E] hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  variant="ghost"
                  onClick={skipStep}
                  className="text-[#8A8A9E] hover:text-white"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* =====================================================================
              STEP 2: EMAIL
             ===================================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[#10B981]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Set Up Email Sending
                </h2>
                <p className="text-[#8A8A9E]">
                  Emails are sent FROM your address. Your customers never know we exist.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Your Name (signature)
                  </label>
                  <Input
                    placeholder="Sarah, Founder of HerStartup"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Company / Product Name
                  </label>
                  <Input
                    placeholder="HerStartup"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Your Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="sarah@herstartup.com"
                    value={senderEmail}
                    onChange={(e) => {
                      setSenderEmail(e.target.value);
                      if (emailStatus === "error") setEmailStatus("idle");
                    }}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#8A8A9E] mb-2 block">
                      SMTP Host
                    </label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="bg-[#0A0A0F] border-[#22222E] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#8A8A9E] mb-2 block">
                      SMTP Port
                    </label>
                    <Input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="bg-[#0A0A0F] border-[#22222E] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    SMTP Password / App Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>

                <Button
                  onClick={testEmailConnection}
                  disabled={!senderEmail || emailStatus === "testing"}
                  variant="outline"
                  className="w-full border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white py-6"
                >
                  {emailStatus === "testing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Email Settings"
                  )}
                </Button>

                {emailStatus === "success" && (
                  <div className="flex items-center gap-2 text-[#10B981] justify-center">
                    <Check className="w-5 h-5" />
                    <span>Settings saved!</span>
                  </div>
                )}
                {emailStatus === "error" && emailError && (
                  <div className="flex items-center gap-2 text-[#EF4444] justify-center text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#22222E]">
                  <p className="text-xs text-[#F59E0B] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      For Gmail, use an <strong>App Password</strong> (not your regular password).{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Generate one →
                      </a>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-[#8A8A9E] hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={skipStep}
                    className="text-[#8A8A9E] hover:text-white"
                  >
                    Skip for now
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={skipStep}
                    className="text-[#8A8A9E] hover:text-white"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              STEP 3: SIMULATE / PREVIEW
             ===================================================================== */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  You&apos;re all set!
                </h2>
                <p className="text-[#8A8A9E]">
                  See exactly what your customers will experience when a payment fails.
                </p>
              </div>

              <Button
                onClick={() => setShowEmailPreview(true)}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold py-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="w-4 h-4 mr-2" />
                Preview Recovery Email
              </Button>

              <Button
                variant="outline"
                onClick={finish}
                disabled={saving}
                className="w-full border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white py-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </>
                )}
              </Button>

              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="text-[#8A8A9E] hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =====================================================================
          EMAIL PREVIEW MODAL
         ===================================================================== */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="bg-[#111118] border-[#22222E] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#F59E0B]" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#8A8A9E]">
              This is the exact email your customers will receive when a payment fails.
            </p>
            <div className="bg-[#0A0A0F] rounded-lg p-4 border border-[#22222E]">
              <p className="text-xs text-[#5A5A6E] mb-2">
                From: {senderEmail || "sarah@herstartup.com"}
              </p>
              <p className="text-sm text-white font-medium mb-4">
                {companyName || "HerStartup"} — Payment Issue
              </p>
              <div className="space-y-3 text-sm text-[#8A8A9E]">
                <p className="text-white">Hi John,</p>
                <p>
                  Looks like your payment for {companyName || "HerStartup"} didn&apos;t go through. No worries — this happens to all of us.
                </p>
                <p>
                  Most of the time it&apos;s just an expired card or a temporary hold from your bank.
                </p>
                <Button className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold my-2">
                  Update Payment Method
                </Button>
                <p>
                  If you&apos;re having trouble, just reply to this email and I&apos;ll help sort it out.
                </p>
                <div className="pt-2">
                  <p className="text-white">Best,</p>
                  <p className="text-white">{senderName || "Sarah"}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEmailPreview(false)}
                className="flex-1 border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
