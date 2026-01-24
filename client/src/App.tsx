import { useState, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import EditorPage from "@/pages/editor";
import PreviewPage from "@/pages/preview";
import NotFound from "@/pages/not-found";
import type { Offer } from "@/lib/types";

function Router() {
  const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);

  const handleLoadOffer = useCallback((offer: Offer) => {
    setCurrentOffer(offer);
  }, []);

  const handleOfferChange = useCallback((offer: Offer) => {
    setCurrentOffer(offer);
  }, []);

  return (
    <Switch>
      <Route path="/">
        <Home onLoadOffer={handleLoadOffer} />
      </Route>
      <Route path="/editor">
        <EditorPage 
          initialOffer={currentOffer} 
          onOfferChange={handleOfferChange}
        />
      </Route>
      <Route path="/preview">
        <PreviewPage offer={currentOffer} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
