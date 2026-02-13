import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const apiKey = "cb_346001cebe7b33b60b7ee5e47772426b";

type Cause = {
  causeId?: string;
  causeTitle?: string;
  description?: string;
  imageUrl?: string;
  category?: string;

};

const Causes = () => {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Use relative URL so Vite dev proxy can avoid browser CORS.
        const res = await fetch(`/api/partner/causes?page=1&limit=25`, {
          headers: { "X-API-Key": apiKey },
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
        }

        const json = await res.json();
        // API returns causes at the top-level: { success, page, ..., causes: [...] }
        const list: Cause[] = json?.causes ?? json?.data?.causes ?? [];

        if (!cancelled) setCauses(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Causes</h1>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {causes.map((cause, idx) => (
              <Card key={cause.causeId ?? `${cause.causeTitle ?? "cause"}-${idx}`}>
                <div key={cause.causeId ?? `${cause.causeTitle ?? "cause"}-${idx}`}>
                  <img src={cause.imageUrl ?? "(no image)"} alt={cause.causeTitle ?? "(untitled cause)"} />
                  <CardContent>
                    <h2>{cause.causeTitle ?? "(untitled cause)"}</h2>
                    <p>{cause.description ?? "(no description)"}</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedCause(cause);
                        setIsWidgetOpen(true);
                      }}
                    >
                      Sponsor
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            ))}
          </div>

          <Dialog open={isWidgetOpen} onOpenChange={setIsWidgetOpen}>
            <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden bg-white border-0">
              <DialogHeader className="hidden">
                <DialogTitle>Sponsor Cause</DialogTitle>
              </DialogHeader>
              {selectedCause && (
                <iframe
                  src={`http://localhost:8085/widget/sponsor?causeId=${selectedCause.causeId ?? ""}&theme=light`}
                  className="w-full h-full border-0"
                  title="Sponsor Widget"
                  allow="payment"
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Causes;