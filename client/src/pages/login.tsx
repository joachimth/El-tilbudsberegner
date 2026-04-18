import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, AlertCircle } from "lucide-react";
import { login } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [brugernavn, setBrugernavn] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brugernavn || !password) return;
    setError("");
    setLoading(true);
    try {
      const user = await login(brugernavn, password);
      queryClient.setQueryData(["/api/auth/me"], user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fejlede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Hurtig Tilbudsberegner</h1>
            <p className="text-sm text-muted-foreground">Til elektrikere</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Log ind</CardTitle>
            <CardDescription>Indtast dine login-oplysninger for at fortsætte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="brugernavn">Brugernavn</Label>
                <Input
                  id="brugernavn"
                  value={brugernavn}
                  onChange={e => setBrugernavn(e.target.value)}
                  placeholder="Dit brugernavn"
                  className="mt-2 h-12 text-base"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="password">Adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Din adgangskode"
                  className="mt-2 h-12 text-base"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Logger ind..." : "Log ind"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
