import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Pencil, Trash2, Package, Settings, Users, Save,
  Calculator, Zap, ImagePlus, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDKK } from "@shared/schema";
import { logout } from "@/lib/auth";
import { queryClient as qc } from "@/lib/queryClient";
import type { CurrentUser } from "@/lib/auth";

interface AdminPageProps {
  currentUser: CurrentUser;
}

// ── Typer ─────────────────────────────────────────────────────────────────────

interface AdminProduct {
  id: string;
  navn: string;
  enhed: string;
  pris_1: number;
  pris_2plus: number;
  kategori: string;
  kostpris?: number | null;
  avanceProcent?: number | null;
  arbejdstidMinutter?: number | null;
  beskrivelse?: string | null;
  forbehold?: string | null;
  aktiv: boolean;
  sortering: number;
}

interface Bruger {
  id: number;
  brugernavn: string;
  rolle: "montør" | "admin";
  oprettetAt: string;
}

const emptyProduct = (): Partial<AdminProduct> => ({
  id: "",
  navn: "",
  enhed: "stk",
  pris_1: 0,
  pris_2plus: 0,
  kategori: "",
  kostpris: undefined,
  avanceProcent: undefined,
  arbejdstidMinutter: undefined,
  beskrivelse: "",
  forbehold: "",
  aktiv: true,
  sortering: 0,
});

// ── Hjælper ────────────────────────────────────────────────────────────────────

function beregnKalkuleret(p: Partial<AdminProduct>, timepris: number) {
  const mat = (p.kostpris ?? 0) * (1 + (p.avanceProcent ?? 0) / 100);
  const arb = ((p.arbejdstidMinutter ?? 0) / 60) * timepris;
  return mat + arb;
}

// ── Produkt-dialog ─────────────────────────────────────────────────────────────

function ProduktDialog({
  open, onClose, initial, timepris, kategorier,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<AdminProduct> | null;
  timepris: number;
  kategorier: string[];
}) {
  const [form, setForm] = useState<Partial<AdminProduct>>(initial || emptyProduct());
  const isNew = !initial?.id || (initial && !("pris_1" in initial));
  const { toast } = useToast();
  const qclient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Partial<AdminProduct>) => {
      const url = isNew ? "/api/admin/products" : `/api/admin/products/${initial!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },
    onSuccess: () => {
      qclient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: isNew ? "Produkt oprettet" : "Produkt opdateret" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Fejl", description: err.message, variant: "destructive" }),
  });

  const set = (k: keyof AdminProduct, v: any) => setForm(f => ({ ...f, [k]: v }));
  const num = (v: string) => v === "" ? undefined : parseFloat(v);

  const kalkuleret = beregnKalkuleret(form, timepris);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Tilføj produkt" : "Rediger produkt"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ID – kun ved oprettelse */}
          {isNew && (
            <div>
              <Label>Produkt-ID <span className="text-destructive">*</span></Label>
              <Input value={form.id || ""} onChange={e => set("id", e.target.value)}
                placeholder="fx stikkontakt_1p" className="mt-1.5 h-11 text-base" />
              <p className="text-xs text-muted-foreground mt-1">Unik nøgle, kun bogstaver/tal/underscore</p>
            </div>
          )}

          <div>
            <Label>Navn <span className="text-destructive">*</span></Label>
            <Input value={form.navn || ""} onChange={e => set("navn", e.target.value)}
              placeholder="Produktnavn" className="mt-1.5 h-11 text-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategori <span className="text-destructive">*</span></Label>
              <input
                list="kategori-forslag"
                value={form.kategori || ""}
                onChange={e => set("kategori", e.target.value)}
                placeholder="fx Belysning"
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <datalist id="kategori-forslag">
                {kategorier.map(k => <option key={k} value={k} />)}
              </datalist>
            </div>
            <div>
              <Label>Enhed <span className="text-destructive">*</span></Label>
              <Input value={form.enhed || ""} onChange={e => set("enhed", e.target.value)}
                placeholder="stk / m / time" className="mt-1.5 h-11 text-base" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Salgspris 1 stk (kr.) <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.pris_1 ?? ""} onChange={e => set("pris_1", num(e.target.value) ?? 0)}
                className="mt-1.5 h-11 text-base" />
            </div>
            <div>
              <Label>Salgspris 2+ stk (kr.) <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.pris_2plus ?? ""} onChange={e => set("pris_2plus", num(e.target.value) ?? 0)}
                className="mt-1.5 h-11 text-base" />
            </div>
          </div>

          {/* Kostprisberegning */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Kostprisberegning (intern)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kostpris (kr.)</Label>
                <Input type="number" value={form.kostpris ?? ""} onChange={e => set("kostpris", num(e.target.value))}
                  placeholder="0" className="mt-1 h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Avance (%)</Label>
                <Input type="number" value={form.avanceProcent ?? ""} onChange={e => set("avanceProcent", num(e.target.value))}
                  placeholder="0" className="mt-1 h-10 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Arbejdstid (min. pr. {form.enhed || "enhed"})</Label>
              <Input type="number" value={form.arbejdstidMinutter ?? ""} onChange={e => set("arbejdstidMinutter", num(e.target.value))}
                placeholder="0" className="mt-1 h-10 text-sm" />
            </div>
            {(form.kostpris || form.avanceProcent || form.arbejdstidMinutter) ? (
              <div className="text-sm text-muted-foreground bg-background rounded-lg px-3 py-2 border">
                Beregnet kostpris: <span className="font-semibold text-foreground">{formatDKK(kalkuleret)}</span>
                <span className="ml-2 text-xs">(kostpris×(1+avance%) + arbejdstid×timepris/60)</span>
              </div>
            ) : null}
          </div>

          <div>
            <Label>Beskrivelse</Label>
            <Textarea value={form.beskrivelse || ""} onChange={e => set("beskrivelse", e.target.value)}
              rows={2} className="mt-1.5 text-base resize-none" />
          </div>

          <div>
            <Label>Produkt-specifikke forbehold</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
              Tilføjes automatisk til tilbuddet når produktet er med. Én per linje.
            </p>
            <Textarea value={form.forbehold || ""} onChange={e => set("forbehold", e.target.value)}
              rows={3} className="mt-1 text-base resize-none"
              placeholder={"Kræver godkendt tavle\nBygherre ansvarlig for gravearbejde"} />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="cursor-pointer">Aktiv (vises i produktliste)</Label>
            <Switch checked={form.aktiv !== false} onCheckedChange={v => set("aktiv", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuller</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? "Gemmer..." : "Gem produkt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Produkt-tab ────────────────────────────────────────────────────────────────

function ProdukterTab({ timepris }: { timepris: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [søgning, setSøgning] = useState("");
  const { toast } = useToast();
  const qclient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<AdminProduct[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Sletning fejlede");
    },
    onSuccess: () => {
      qclient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      qclient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produkt slettet" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Fejl ved sletning", variant: "destructive" }),
  });

  const filtered = products.filter(p =>
    p.navn.toLowerCase().includes(søgning.toLowerCase()) ||
    p.kategori.toLowerCase().includes(søgning.toLowerCase())
  );

  const kategorier = Array.from(new Set(products.map(p => p.kategori))).sort();

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Søg produkt eller kategori..."
          value={søgning}
          onChange={e => setSøgning(e.target.value)}
          className="h-10 text-base"
        />
        <Button onClick={() => { setEditTarget(null); setDialogOpen(true); }} className="shrink-0 h-10">
          <Plus className="w-4 h-4 mr-2" />
          Tilføj
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Indlæser produkter...</p>
      ) : (
        kategorier.map(kat => {
          const prods = filtered.filter(p => p.kategori === kat);
          if (prods.length === 0) return null;
          return (
            <div key={kat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">{kat}</p>
              <Card>
                <CardContent className="p-0">
                  {prods.map((p, i) => {
                    const kalk = beregnKalkuleret(p, timepris);
                    const fortjeneste = p.pris_1 - kalk;
                    return (
                      <div key={p.id} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{p.navn}</span>
                            {!p.aktiv && <Badge variant="secondary" className="text-xs">Inaktiv</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{formatDKK(p.pris_1)} / {formatDKK(p.pris_2plus)} (2+) pr. {p.enhed}</span>
                            {kalk > 0 && (
                              <span className={fortjeneste >= 0 ? "text-green-600" : "text-destructive"}>
                                kostpris {formatDKK(kalk)} · fortjeneste {formatDKK(fortjeneste)}
                              </span>
                            )}
                            {p.arbejdstidMinutter ? <span>{p.arbejdstidMinutter} min.</span> : null}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => { setEditTarget(p); setDialogOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          );
        })
      )}

      {dialogOpen && (
        <ProduktDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditTarget(null); }}
          initial={editTarget}
          timepris={timepris}
          kategorier={kategorier}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet produkt</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil slette <strong>{deleteTarget?.navn}</strong>?
              Dette kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Indstillinger-tab ──────────────────────────────────────────────────────────

function IndstillingerTab() {
  const { toast } = useToast();
  const qclient = useQueryClient();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const s = { ...settings, ...form };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) throw new Error("Gem fejlede");
    },
    onSuccess: () => {
      qclient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      qclient.invalidateQueries({ queryKey: ["/api/config"] });
      setForm({});
      toast({ title: "Indstillinger gemt" });
    },
    onError: () => toast({ title: "Fejl ved gem", variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Indlæser...</p>;

  return (
    <div className="space-y-4">
      {/* Prisberegning */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Prisberegning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Timepris (kr./time)</Label>
            <Input type="number" value={s.timepris || ""} onChange={e => set("timepris", e.target.value)}
              className="mt-2 h-11 text-base max-w-xs" placeholder="595" />
            <p className="text-xs text-muted-foreground mt-1">
              Bruges til at beregne arbejdskraftomkostning fra produkternes arbejdstid
            </p>
          </div>
          <div>
            <Label>Momsprocent (%)</Label>
            <Input type="number" value={s.momsprocent || ""} onChange={e => set("momsprocent", e.target.value)}
              className="mt-2 h-11 text-base max-w-xs" placeholder="25" />
          </div>
        </CardContent>
      </Card>

      {/* Firmaprofil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Firmaprofil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Firmalogo */}
          <div>
            <Label>Firmalogo</Label>
            <div className="mt-2 space-y-3">
              {s.firmalogo && (
                <div className="relative inline-block">
                  <img src={s.firmalogo} alt="Firmalogo" className="max-h-20 max-w-[200px] object-contain rounded border p-1 bg-white" />
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/admin/logo", { method: "DELETE", credentials: "include" });
                      qclient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
                      qclient.invalidateQueries({ queryKey: ["/api/config"] });
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                    title="Fjern logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
                  <ImagePlus className="w-4 h-4" />
                  {s.firmalogo ? "Skift logo" : "Upload logo"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("logo", file);
                    const res = await fetch("/api/admin/logo", { method: "POST", credentials: "include", body: fd });
                    if (res.ok) {
                      qclient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
                      qclient.invalidateQueries({ queryKey: ["/api/config"] });
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG, JPG eller SVG — maks. 2 MB. Vises på alle tilbud.</p>
            </div>
          </div>

          {[
            { k: "firmanavn", label: "Firmanavn" },
            { k: "adresse", label: "Adresse" },
            { k: "postnrBy", label: "Postnr. og by" },
            { k: "telefon", label: "Telefon" },
            { k: "email", label: "E-mail" },
            { k: "cvr", label: "CVR-nummer" },
          ].map(({ k, label }) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input value={s[k] || ""} onChange={e => set(k, e.target.value)}
                className="mt-2 h-11 text-base" />
            </div>
          ))}
          <div>
            <Label>Standardtekst på tilbud</Label>
            <Textarea value={s.standardtekst || ""} onChange={e => set("standardtekst", e.target.value)}
              rows={3} className="mt-2 text-base resize-none" />
          </div>
          <div>
            <Label>Betalingsbetingelser</Label>
            <Textarea value={s.betalingsbetingelser || ""} onChange={e => set("betalingsbetingelser", e.target.value)}
              rows={2} className="mt-2 text-base resize-none" />
          </div>
          <div>
            <Label>Standardforbehold</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Disse forbehold vises automatisk på alle tilbud, adskilt fra tilbudsspecifikke bemærkninger. Én per linje.
            </p>
            <Textarea value={s.standardforbehold || ""} onChange={e => set("standardforbehold", e.target.value)}
              rows={4} className="mt-1 text-base resize-none"
              placeholder={"Alle priser er ekskl. moms og afgifter\nPriserne er gældende i 30 dage fra tilbudsdato"} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full h-12">
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? "Gemmer..." : "Gem indstillinger"}
      </Button>
    </div>
  );
}

// ── Brugere-tab ────────────────────────────────────────────────────────────────

function BrugereTab({ currentUser }: { currentUser: CurrentUser }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ brugernavn: "", password: "", rolle: "montør" as "montør" | "admin" });
  const [deleteTarget, setDeleteTarget] = useState<Bruger | null>(null);
  const { toast } = useToast();
  const qclient = useQueryClient();

  const { data: users = [] } = useQuery<Bruger[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },
    onSuccess: () => {
      qclient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Bruger oprettet" });
      setDialogOpen(false);
      setNewUser({ brugernavn: "", password: "", rolle: "montør" });
    },
    onError: (e: Error) => toast({ title: "Fejl", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },
    onSuccess: () => {
      qclient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Bruger slettet" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Fejl", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="h-10">
          <Plus className="w-4 h-4 mr-2" />
          Tilføj bruger
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t" : ""}`}>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{u.brugernavn}</span>
                {u.id === currentUser.id && (
                  <span className="ml-2 text-xs text-muted-foreground">(dig)</span>
                )}
              </div>
              <Badge variant={u.rolle === "admin" ? "default" : "secondary"}>
                {u.rolle}
              </Badge>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                disabled={u.id === currentUser.id}
                onClick={() => setDeleteTarget(u)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Opret bruger-dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Opret ny bruger</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Brugernavn</Label>
              <Input value={newUser.brugernavn} onChange={e => setNewUser(u => ({ ...u, brugernavn: e.target.value }))}
                className="mt-2 h-11 text-base" placeholder="jens" />
            </div>
            <div>
              <Label>Adgangskode (min. 6 tegn)</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                className="mt-2 h-11 text-base" />
            </div>
            <div>
              <Label>Rolle</Label>
              <div className="flex gap-3 mt-2">
                {(["montør", "admin"] as const).map(r => (
                  <button key={r} onClick={() => setNewUser(u => ({ ...u, rolle: r }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${newUser.rolle === r ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuller</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Opretter..." : "Opret bruger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet bruger</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil slette brugeren <strong>{deleteTarget?.brugernavn}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Admin-side (hoved) ─────────────────────────────────────────────────────────

export default function AdminPage({ currentUser }: AdminPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const timepris = parseFloat(settings?.timepris || "595");

  const handleLogout = async () => {
    await logout();
    qc.setQueryData(["/api/auth/me"], null);
    navigate("/login");
    toast({ title: "Du er logget ud" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base">Administration</h1>
            <p className="text-xs text-muted-foreground">{currentUser.brugernavn}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log ud
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="produkter">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="produkter" className="flex-1 gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produkter</span>
            </TabsTrigger>
            <TabsTrigger value="indstillinger" className="flex-1 gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Indstillinger</span>
            </TabsTrigger>
            <TabsTrigger value="brugere" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Brugere</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produkter">
            <ProdukterTab timepris={timepris} />
          </TabsContent>
          <TabsContent value="indstillinger">
            <IndstillingerTab />
          </TabsContent>
          <TabsContent value="brugere">
            <BrugereTab currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
