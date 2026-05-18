"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, AlertCircle, Mail, CreditCard, User, Clock, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [stripeKey, setStripeKey] = useState("");
  const [stripeStatus, setStripeStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  
  const [founderName, setFounderName] = useState("Sarah");
  const [companyName, setCompanyName] = useState("HerStartup");
  const [autoFallback, setAutoFallback] = useState(true);
  const [retryDays, setRetryDays] = useState([1, 3, 7, 14]);

  const validateStripe = () => {
    setStripeStatus("validating");
    setTimeout(() => {
      if (stripeKey.startsWith("sk_")) {
        setStripeStatus("success");
      } else {
        setStripeStatus("error");
      }
    }, 1500);
  };

  const testEmail = () => {
    setEmailStatus("testing");
    setTimeout(() => {
      setEmailStatus("success");
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-[#8A8A9E]">Configure your account and integrations</p>
      </div>

      {/* Stripe Connection */}
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Stripe Connection</h2>
              <p className="text-sm text-[#8A8A9E]">Connect your Stripe account to receive webhooks</p>
            </div>
          </div>

          <Separator className="bg-[#22222E]" />

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-[#8A8A9E] mb-2 block">Stripe API Key</Label>
              <div className="flex gap-3">
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E] flex-1"
                />
                <Button
                  onClick={validateStripe}
                  disabled={!stripeKey || stripeStatus === "validating"}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold"
                >
                  {stripeStatus === "validating" ? "Checking..." : "Validate"}
                </Button>
              </div>
            </div>

            {stripeStatus === "success" && (
              <div className="flex items-center gap-2 text-[#10B981]">
                <Check className="w-4 h-4" />
                <span className="text-sm">Connected! Webhooks are active.</span>
              </div>
            )}
            {stripeStatus === "error" && (
              <div className="flex items-center gap-2 text-[#EF4444]">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Invalid key. Make sure it's a secret key (sk_...)</span>
              </div>
            )}

            <p className="text-xs text-[#5A5A6E]">
              Find your API key in{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] hover:underline">
                Stripe Dashboard → Developers → API keys
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Sender */}
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Sender</h2>
              <p className="text-sm text-[#8A8A9E]">Configure SMTP to send emails from your address</p>
            </div>
          </div>

          <Separator className="bg-[#22222E]" />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#8A8A9E] mb-2 block">SMTP Host</Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="bg-[#0A0A0F] border-[#22222E] text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-[#8A8A9E] mb-2 block">SMTP Port</Label>
                <Input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="bg-[#0A0A0F] border-[#22222E] text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-[#8A8A9E] mb-2 block">Username</Label>
              <Input
                placeholder="founder@yourcompany.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
              />
            </div>

            <div>
              <Label className="text-sm text-[#8A8A9E] mb-2 block">Password</Label>
              <Input
                type="password"
                placeholder="App Password (not your regular password)"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={testEmail}
                disabled={emailStatus === "testing"}
                variant="outline"
                className="border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white"
              >
                {emailStatus === "testing" ? "Testing..." : "Test Connection"}
              </Button>
              {emailStatus === "success" && (
                <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                  Test email sent!
                </Badge>
              )}
            </div>

            <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#22222E]">
              <p className="text-xs text-[#F59E0B] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                For Gmail, use an App Password (not your regular password).{" "}
                <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline">
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personalization */}
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <User className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Personalization</h2>
              <p className="text-sm text-[#8A8A9E]">How your emails will appear to customers</p>
            </div>
          </div>

          <Separator className="bg-[#22222E]" />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#8A8A9E] mb-2 block">Founder Name</Label>
                <Input
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  className="bg-[#0A0A0F] border-[#22222E] text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-[#8A8A9E] mb-2 block">Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-[#0A0A0F] border-[#22222E] text-white"
                />
              </div>
            </div>

            <div className="bg-[#0A0A0F] rounded-lg p-4 border border-[#22222E]">
              <p className="text-xs text-[#5A5A6E] mb-2">Signature Preview</p>
              <p className="text-sm text-white">Best,</p>
              <p className="text-sm text-white">{founderName || "Your Name"}</p>
              <p className="text-sm text-[#8A8A9E]">{companyName || "Your Company"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retry Schedule */}
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Retry Schedule</h2>
              <p className="text-sm text-[#8A8A9E]">When to follow up after a failed payment</p>
            </div>
          </div>

          <Separator className="bg-[#22222E]" />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {retryDays.map((day, index) => (
                <div key={index} className="flex-1">
                  <Label className="text-xs text-[#5A5A6E] mb-1 block text-center">
                    Email {index + 1}
                  </Label>
                  <Input
                    type="number"
                    value={day}
                    onChange={(e) => {
                      const newDays = [...retryDays];
                      newDays[index] = parseInt(e.target.value) || 0;
                      setRetryDays(newDays);
                    }}
                    className="bg-[#0A0A0F] border-[#22222E] text-white text-center"
                  />
                  <p className="text-xs text-[#5A5A6E] text-center mt-1">days</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0A0A0F] rounded-lg border border-[#22222E]">
              <div>
                <p className="text-sm text-white font-medium">24h Auto-Fallback</p>
                <p className="text-xs text-[#5A5A6E]">Send default template if you don't review within 24 hours</p>
              </div>
              <button
                onClick={() => setAutoFallback(!autoFallback)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  autoFallback ? "bg-[#F59E0B]" : "bg-[#22222E]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                    autoFallback ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-[#111118] border-[#EF4444]/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#EF4444]">Delete Account</h3>
              <p className="text-xs text-[#8A8A9E] mt-1">This will permanently delete all your data</p>
            </div>
            <Button
              variant="outline"
              className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
