import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building, Calendar, FileText, MessageSquare } from "lucide-react";
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
}: KundeInfoFormProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Projekt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="tilbudNr" className="text-xs">Tilbud nr.</Label>
            <Input
              id="tilbudNr"
              value={meta.tilbudNr || ""}
              onChange={e => onMetaChange({ ...meta, tilbudNr: e.target.value })}
              placeholder="2026-0001"
              className="mt-1"
              data-testid="input-tilbud-nr"
            />
          </div>
          <div>
            <Label htmlFor="projektnavn" className="text-xs">Projektnavn</Label>
            <Input
              id="projektnavn"
              value={meta.projektnavn}
              onChange={e => onMetaChange({ ...meta, projektnavn: e.target.value })}
              placeholder="Renovering af køkken"
              className="mt-1"
              data-testid="input-projektnavn"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dato" className="text-xs">Dato</Label>
              <Input
                id="dato"
                type="date"
                value={meta.dato}
                onChange={e => onMetaChange({ ...meta, dato: e.target.value })}
                className="mt-1"
                data-testid="input-dato"
              />
            </div>
            <div>
              <Label htmlFor="reference" className="text-xs">Reference</Label>
              <Input
                id="reference"
                value={meta.reference}
                onChange={e => onMetaChange({ ...meta, reference: e.target.value })}
                placeholder="Ref. nr."
                className="mt-1"
                data-testid="input-reference"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Kunde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="kundeNavn" className="text-xs">Navn</Label>
            <Input
              id="kundeNavn"
              value={kunde.navn}
              onChange={e => onKundeChange({ ...kunde, navn: e.target.value })}
              placeholder="Anders Andersen"
              className="mt-1"
              data-testid="input-kunde-navn"
            />
          </div>
          <div>
            <Label htmlFor="kundeAdresse" className="text-xs">Adresse</Label>
            <Input
              id="kundeAdresse"
              value={kunde.adresse}
              onChange={e => onKundeChange({ ...kunde, adresse: e.target.value })}
              placeholder="Testvej 123, 2000 Frederiksberg"
              className="mt-1"
              data-testid="input-kunde-adresse"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="kundeEmail" className="text-xs">Email</Label>
              <Input
                id="kundeEmail"
                type="email"
                value={kunde.email}
                onChange={e => onKundeChange({ ...kunde, email: e.target.value })}
                placeholder="email@eksempel.dk"
                className="mt-1"
                data-testid="input-kunde-email"
              />
            </div>
            <div>
              <Label htmlFor="kundeTelefon" className="text-xs">Telefon</Label>
              <Input
                id="kundeTelefon"
                type="tel"
                value={kunde.telefon}
                onChange={e => onKundeChange({ ...kunde, telefon: e.target.value })}
                placeholder="+45 12 34 56 78"
                className="mt-1"
                data-testid="input-kunde-telefon"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building className="w-4 h-4" />
            Moms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="visInklMoms" className="text-sm">
              Vis total inkl. moms
            </Label>
            <Switch
              id="visInklMoms"
              checked={moms.visInkl}
              onCheckedChange={checked => onMomsChange({ ...moms, visInkl: checked })}
              data-testid="switch-moms"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Alle priser vises ekskl. moms. Total inkl. moms (25%) vises i bunden.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Bemærkninger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bemærkninger}
            onChange={e => onBemærkningerChange(e.target.value)}
            placeholder="Tilføj evt. bemærkninger til tilbuddet..."
            rows={4}
            className="resize-none"
            data-testid="textarea-bemærkninger"
          />
        </CardContent>
      </Card>
    </div>
  );
}
