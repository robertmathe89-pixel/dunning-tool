"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const router = useRouter();

  // Step 1: Stripe
  const [stripeKey, setStripeKey] = useState("");
  const [stripeStatus, setStripeStatus] = useState<"idle" | "validating" | "success" | "error">("idle");

  // Step 2: Email
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const validateStripe = () => {
    setStripeStatus("validating");
    setTimeout(() => {
      if (stripeKey.startsWith("sk_")) {
        setStripeStatus("success");
        setTimeout(() => setStep(2), 1000);
      } else {
        setStripeStatus("error");
      }
    }, 1500);
  };

  const testEmail = () => {
    setEmailStatus("testing");
    setTimeout(() => {
      setEmailStatus("success");
      setTimeout(() => setStep(3), 1000);
    }, 2000);
  };

  const simulateFailure = () => {
    setShowEmailPreview(true);
  };

  const finish = () => {
    router.push("/dashboard");
  };

  const skipStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#111118] border-[#22222E]">
        <CardContent className="p-8">
          {/* Progress */}
          <ProgressIndicator currentStep={step} totalSteps={3} />

          {/* Step 1: Connect Stripe */}
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
                  Paste your Stripe API key to start listening for failed payments
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Stripe API Key
                  </label>
                  <Input
                    type="password"
                    placeholder="sk_test_..."
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
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
                      Checking...
                    </>
                  ) : (
                    "Validate Key"
                  )}
                </Button>

                {stripeStatus === "success" && (
                  <div className="flex items-center gap-2 text-[#10B981] justify-center">
                    <Check className="w-5 h-5" />
                    <span>Connected!</span>
                  </div>
                )}
                {stripeStatus === "error" && (
                  <div className="flex items-center gap-2 text-[#EF4444] justify-center">
                    <AlertCircle className="w-5 h-5" />
                    <span>Invalid key. Use a secret key (sk_...)</span>
                  </div>
                )}

                <p className="text-xs text-[#5A5A6E] text-center">
                  Don't know where to find it?{" "}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F59E0B] hover:underline"
                  >
                    Stripe Dashboard → Developers → API keys
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

          {/* Step 2: Connect Email */}
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
                  Emails will be sent FROM your address. We don't touch your customers.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#8A8A9E] mb-2 block">
                    Your Email
                  </label>
                  <Input
                    placeholder="founder@yourcompany.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
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
                    Password
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
                  onClick={testEmail}
                  disabled={emailStatus === "testing"}
                  variant="outline"
                  className="w-full border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white py-6"
                >
                  {emailStatus === "testing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                {emailStatus === "success" && (
                  <div className="flex items-center gap-2 text-[#10B981] justify-center">
                    <Check className="w-5 h-5" />
                    <span>Test email sent! Check your inbox.</span>
                  </div>
                )}

                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#22222E]">
                  <p className="text-xs text-[#F59E0B] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    For Gmail, use an App Password (not your regular password)
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

          {/* Step 3: Simulate Failure */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  See It In Action
                </h2>
                <p className="text-[#8A8A9E]">
                  No real payments yet? No problem. Simulate one to see how it works.
                </p>
              </div>

              <Button
                onClick={simulateFailure}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold py-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Simulate a Failed Payment
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowEmailPreview(true)}
                className="w-full border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white py-6"
              >
                <Send className="w-4 h-4 mr-2" />
                Preview Email
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
                <Button
                  onClick={finish}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Modal */}
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
                From: sarah@herstartup.com
              </p>
              <p className="text-sm text-white font-medium mb-4">
                HerStartup — Payment Issue
              </p>
              <div className="space-y-3 text-sm text-[#8A8A9E]">
                <p className="text-white">Hi John,</p>
                <p>
                  Looks like your payment for HerStartup didn't go through. No worries — this happens to all of us.
                </p>
                <p>
                  Most of the time it's just an expired card or a temporary hold from your bank.
                </p>
                <Button className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold my-2">
                  Update Payment Method
                </Button>
                <p>
                  If you're having trouble, just reply to this email and I'll help sort it out.
                </p>
                <div className="pt-2">
                  <p className="text-white">Best,</p>
                  <p className="text-white">Sarah</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold">
                Send Test to Me
              </Button>
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
