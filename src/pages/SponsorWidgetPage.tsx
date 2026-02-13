import React, { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const WIDGET_EVENTS = {
  SPONSOR_SUCCESS: "SPONSOR_SUCCESS",
  SPONSOR_ERROR: "SPONSOR_ERROR",
} as const;

function postToParent(type: string, data: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage({ type, data }, "*");
  }
}

/**
 * Dedicated widget route: sponsor flow only (no Header/Footer/Nav).
 * Query params: apiKey, affiliateId, causeId (per api_integration_guide).
 */
export default function SponsorWidgetPage() {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get("apiKey") ?? "";
  const affiliateId = searchParams.get("affiliateId") ?? "";
  const causeId = searchParams.get("causeId") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !email.trim()) return;
      setSubmitting(true);
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (apiKey) headers["X-API-Key"] = apiKey;
        const res = await fetch("/api/partner/sponsorships", {
          method: "POST",
          headers,
          body: JSON.stringify({
            causeId: causeId || "default-cause",
            sponsorName: name.trim(),
            sponsorEmail: email.trim(),
            amount: amount ? parseFloat(amount) : undefined,
            affiliateId: affiliateId || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.sponsorshipId) {
          postToParent(WIDGET_EVENTS.SPONSOR_SUCCESS, { sponsorshipId: data.sponsorshipId });
        } else {
          postToParent(WIDGET_EVENTS.SPONSOR_ERROR, {
            message: data.message || "Failed to create sponsorship",
          });
        }
      } catch (err: unknown) {
        postToParent(WIDGET_EVENTS.SPONSOR_ERROR, {
          message: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [apiKey, affiliateId, causeId, name, email, amount]
  );

  return (
    <div className="min-h-screen w-full bg-background flex items-start justify-center p-4">
      <Card className="w-full max-w-[500px] shadow-sm">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold">Sponsor this cause</h2>
          {causeId && (
            <p className="text-sm text-muted-foreground">Cause ID: {causeId}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (optional)</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit sponsorship"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
