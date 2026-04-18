import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, FileText, MessageSquare, Percent } from "lucide-react";
import type { Kunde, Meta, Moms } from "@/lib/types";

interface KundeInfoFormProps {
  kunde: Kunde;
  meta: Meta;
  moms: Moms;
  bemærkninger: string;
  onKundeChange: (kunde: Kunde) => void;
  onMetaChange: (meta: Meta) => void;
  onMomsChange: (moms: Moms) => void;
  onBemærkningerChange: (bemærkninger: string) => void;
  testIdPrefix?: string;
}

export function KundeInfoForm({
  kunde,
  meta,
  moms,
  bemærkninger,
  onKundeChange,
  onMetaChange,
  onMomsChange,
  onBemærkningerChange,
  testIdPrefix = "",
}: KundeInfoFormProps) {
  const tid = (id: string) => testIdPrefix ? `${testIdPrefix}-${id}` : id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Projekt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={tid("tilbudNr")} className="text-sm font-medium">Tilbud nr.</Label>
            <Input
              id={tid("tilbudNr")}
              value={meta.tilbudNr || ""}
              onChange={e => onMetaChange({ ...meta, tilbudNr: e.target.value })}
              placeholder="2026-0001"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-tilbud-nr")}
            />
          </div>
          <div>
            <Label htmlFor={tid("projektnavn")} className="text-sm font-medium">Projektnavn</Label>
            <Input
              id={tid("projektnavn")}
              value={meta.projektnavn}
              onChange={e => onMetaChange({ ...meta, projektnavn: e.target.value })}
              placeholder="Renovering af køkken"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-projektnavn")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={tid("dato")} className="text-sm font-medium">Dato</Label>
              <Input
                id={tid("dato")}
                type="date"
                value={meta.dato}
                onChange={e => onMetaChange({ ...meta, dato: e.target.value })}
                className="mt-2 h-12 text-base"
                data-testid={tid("input-dato")}
              />
            </div>
            <div>
              <Label htmlFor={tid("reference")} className="text-sm font-medium">Reference</Label>
              <Input
                id={tid("reference")}
                value={meta.reference}
                onChange={e => onMetaChange({ ...meta, reference: e.target.value })}
                placeholder="Ref. nr."
                className="mt-2 h-12 text-base"
                data-testid={tid("input-reference")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Kunde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={tid("kundeNavn")} className="text-sm font-medium">Navn</Label>
            <Input
              id={tid("kundeNavn")}
              value={kunde.navn}
              onChange={e => onKundeChange({ ...kunde, navn: e.target.value })}
              placeholder="Anders Andersen"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-kunde-navn")}
            />
          </div>
          <div>
            <Label htmlFor={tid("kundeAdresse")} className="text-sm font-medium">Adresse</Label>
            <Input
              id={tid("kundeAdresse")}
              value={kunde.adresse}
              onChange={e => onKundeChange({ ...kunde, adresse: e.target.value })}
              placeholder="Testvej 123, 2000 Frederiksberg"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-kunde-adresse")}
            />
          </div>
          <div>
            <Label htmlFor={tid("kundeEmail")} className="text-sm font-medium">Email</Label>
            <Input
              id={tid("kundeEmail")}
              type="email"
              value={kunde.email}
              onChange={e => onKundeChange({ ...kunde, email: e.target.value })}
              placeholder="email@eksempel.dk"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-kunde-email")}
            />
          </div>
          <div>
            <Label htmlFor={tid("kundeTelefon")} className="text-sm font-medium">Telefon</Label>
            <Input
              id={tid("kundeTelefon")}
              type="tel"
              value={kunde.telefon}
              onChange={e => onKundeChange({ ...kunde, telefon: e.target.value })}
              placeholder="+45 12 34 56 78"
              className="mt-2 h-12 text-base"
              data-testid={tid("input-kunde-telefon")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Moms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor={tid("visInklMoms")} className="text-base cursor-pointer flex-1">
              Vis total inkl. moms
            </Label>
            <Switch
              id={tid("visInklMoms")}
              checked={moms.visInkl}
              onCheckedChange={checked => onMomsChange({ ...moms, visInkl: checked })}
              data-testid={tid("switch-moms")}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Alle priser vises ekskl. moms. Moms (25%) beregnes automatisk.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Bemærkninger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bemærkninger}
            onChange={e => onBemærkningerChange(e.target.value)}
            placeholder="Tilføj evt. bemærkninger til tilbuddet..."
            rows={4}
            className="resize-none text-base"
            data-testid={tid("textarea-bemærkninger")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
