import { useState, useCallback } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import EditorPage from "@/pages/editor";
import PreviewPage from "@/pages/preview";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import TemplateSelector from "@/pages/template-selector";
import NotFound from "@/pages/not-found";
import type { Offer } from "@/lib/types";
import type { CurrentUser } from "@/lib/auth";
import type { Skabelon } from "@shared/schema";
import { createEmptyOffer, migrerLokationIds } from "@/lib/offer-utils";
import { ErrorBoundary } from "@/components/error-boundary";

function Router() {
  const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
  const [, navigate] = useLocation();

  const { data: currentUser, isLoading } = useQuery<CurrentUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const handleLoadOffer = useCallback((offer: Offer) => {
    setCurrentOffer(offer);
    navigate("/editor");
  }, [navigate]);

  const handleNewOffer = useCallback(() => {
    navigate("/template-selector");
  }, [navigate]);

  const handleTemplateSelected = useCallback(async (skabelon: Skabelon) => {
    const offer = createEmptyOffer(skabelon);
    try {
      const [defaultsRes, nrRes] = await Promise.all([
        fetch(`/api/skabelon/${skabelon}/defaults`, { credentials: "include" }),
        fetch("/api/tilbud/naeste-nr", { credentials: "include" }),
      ]);
      if (defaultsRes.ok) {
        const data = await defaultsRes.json();
        if (Array.isArray(data.defaultLokationer) && data.defaultLokationer.length > 0) {
          offer.lokationer = migrerLokationIds(data.defaultLokationer);
        }
      }
      if (nrRes.ok) {
        const { nr } = await nrRes.json();
        offer.meta.tilbudNr = nr;
      }
    } catch {}
    setCurrentOffer(offer);
    navigate("/editor");
  }, [navigate]);

  const handleOfferChange = useCallback((offer: Offer) => {
    setCurrentOffer(offer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Indlæser...</p>
      </div>
    );
  }

  return (
    <Switch>
      {/* Login – tilgængelig for alle */}
      <Route path="/login">
        {currentUser ? <Redirect to="/" /> : <LoginPage />}
      </Route>

      {/* Forside */}
      <Route path="/">
        {!currentUser
          ? <Redirect to="/login" />
          : <Home currentUser={currentUser} onLoadOffer={handleLoadOffer} onNewOffer={handleNewOffer} />}
      </Route>

      {/* Editor */}
      <Route path="/editor">
        {!currentUser
          ? <Redirect to="/login" />
          : <EditorPage initialOffer={currentOffer} onOfferChange={handleOfferChange} currentUser={currentUser} />}
      </Route>

      {/* Forhåndsvisning */}
      <Route path="/preview">
        {!currentUser
          ? <Redirect to="/login" />
          : <PreviewPage offer={currentOffer} currentUser={currentUser} />}
      </Route>

      {/* Template-vælger */}
      <Route path="/template-selector">
        {!currentUser
          ? <Redirect to="/login" />
          : <TemplateSelector onSelect={handleTemplateSelected} />}
      </Route>

      {/* Admin – kun admin-rolle */}
      <Route path="/admin">
        {!currentUser
          ? <Redirect to="/login" />
          : currentUser.rolle !== "admin"
            ? <Redirect to="/" />
            : <AdminPage currentUser={currentUser} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
