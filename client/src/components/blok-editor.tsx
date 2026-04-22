import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, Plus,
  Image, Type, Star, MapPin, DollarSign, AlertTriangle, Phone, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { Blok, BlokType, BlokData } from "@shared/schema";
import { STANDARD_BLOK_RAEKKEFOELGE } from "@shared/schema";

const BLOK_META: Record<BlokType, { label: string; beskrivelse: string; ikon: React.ReactNode }> = {
  hero:           { label: "Hero-sektion",     beskrivelse: "Stor overskrift og undertitel øverst i tilbuddet", ikon: <Zap className="w-5 h-5" /> },
  fordele:        { label: "Fordele-kort",      beskrivelse: "3 kort med fordele (ikon, titel, tekst)", ikon: <Star className="w-5 h-5" /> },
  lokationer:     { label: "Lokationer",        beskrivelse: "Produktliste fordelt på rum/lokationer", ikon: <MapPin className="w-5 h-5" /> },
  prissummary:    { label: "Prisoversigt",      beskrivelse: "Samlet pris ekskl./inkl. moms", ikon: <DollarSign className="w-5 h-5" /> },
  forbehold:      { label: "Forbehold",         beskrivelse: "Tilbudsspecifikke bemærkninger og standardforbehold", ikon: <AlertTriangle className="w-5 h-5" /> },
  cta:            { label: "Call to action",    beskrivelse: "Fremhævet boks med opfordring til kontakt", ikon: <Phone className="w-5 h-5" /> },
  kontaktperson:  { label: "Kontaktperson",     beskrivelse: "Kontaktpersonens navn, titel og kontaktinfo", ikon: <Phone className="w-5 h-5" /> },
  custom_billede: { label: "Brugerdefineret billede", beskrivelse: "Upload et billede med valgfri billedtekst", ikon: <Image className="w-5 h-5" /> },
  custom_tekst:   { label: "Brugerdefineret tekst",   beskrivelse: "Fritekst-afsnit med overskrift og stilvalg", ikon: <Type className="w-5 h-5" /> },
};

function newBlok(type: BlokType): Blok {
  return { id: `${type}_${Date.now()}`, type };
}

function BlokInlineEditor({
  blok,
  onChange,
  allowImageUpload,
}: {
  blok: Blok;
  onChange: (data: BlokData) => void;
  allowImageUpload: boolean;
}) {
  const d = blok.data || {};
  const set = (patch: Partial<BlokData>) => onChange({ ...d, ...patch });
  const fileRef = useRef<HTMLInputElement>(null);

  switch (blok.type) {
    case "hero":
      return (
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Overskrift</Label>
            <Input value={d.overskrift || ""} onChange={e => set({ overskrift: e.target.value })} placeholder="Fra offer.meta.projektnavn som fallback" />
          </div>
          <div>
            <Label className="text-xs">Underoverskrift</Label>
            <Textarea value={d.underoverskrift || ""} onChange={e => set({ underoverskrift: e.target.value })} rows={2} placeholder="Kort beskrivelse af tilbuddet..." />
          </div>
          <div>
            <Label className="text-xs">Billede-URL (valgfri)</Label>
            <Input value={d.billedeUrl || ""} onChange={e => set({ billedeUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
      );

    case "fordele":
      return (
        <div className="space-y-3 pt-2">
          {(d.kort || [{ ikon: "⚡", titel: "", tekst: "" }, { ikon: "🏅", titel: "", tekst: "" }, { ikon: "🛡️", titel: "", tekst: "" }]).map((k, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <div className="w-16">
                  <Label className="text-xs">Ikon</Label>
                  <Input value={k.ikon || ""} onChange={e => {
                    const kort = [...(d.kort || [{ ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }])];
                    kort[i] = { ...kort[i], ikon: e.target.value };
                    set({ kort });
                  }} placeholder="⚡" className="text-center" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Titel</Label>
                  <Input value={k.titel || ""} onChange={e => {
                    const kort = [...(d.kort || [{ ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }])];
                    kort[i] = { ...kort[i], titel: e.target.value };
                    set({ kort });
                  }} placeholder="Fordel titel" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Beskrivelse</Label>
                <Input value={k.tekst || ""} onChange={e => {
                  const kort = [...(d.kort || [{ ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }, { ikon: "", titel: "", tekst: "" }])];
                  kort[i] = { ...kort[i], tekst: e.target.value };
                  set({ kort });
                }} placeholder="Kort beskrivelse..." />
              </div>
            </div>
          ))}
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Overskrift</Label>
            <Input value={d.ctaOverskrift || ""} onChange={e => set({ ctaOverskrift: e.target.value })} placeholder="Klar til at komme i gang?" />
          </div>
          <div>
            <Label className="text-xs">Brødtekst</Label>
            <Textarea value={d.ctaTekst || ""} onChange={e => set({ ctaTekst: e.target.value })} rows={2} placeholder="Kontakt os i dag..." />
          </div>
        </div>
      );

    case "kontaktperson":
      return (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Navn</Label>
              <Input value={d.navn || ""} onChange={e => set({ navn: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Titel</Label>
              <Input value={d.titel || ""} onChange={e => set({ titel: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={d.telefon || ""} onChange={e => set({ telefon: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={d.email || ""} onChange={e => set({ email: e.target.value })} />
            </div>
          </div>
        </div>
      );

    case "custom_billede":
      return (
        <div className="space-y-3 pt-2">
          {allowImageUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => set({ src: ev.target?.result as string });
                  reader.readAsDataURL(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Image className="w-4 h-4 mr-2" />
                {d.src ? "Skift billede" : "Vælg billede"}
              </Button>
              {d.src && <img src={d.src} alt="" className="max-h-24 rounded border object-contain" />}
            </>
          )}
          <div>
            <Label className="text-xs">Billedtekst (valgfri)</Label>
            <Input value={d.billedeTekst || ""} onChange={e => set({ billedeTekst: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Bredde</Label>
            <Select value={d.bredde || "indhold"} onValueChange={v => set({ bredde: v as "fuld" | "indhold" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indhold">Indhold</SelectItem>
                <SelectItem value="fuld">Fuld bredde</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "custom_tekst":
      return (
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Overskrift (valgfri)</Label>
            <Input value={d.overskrift || ""} onChange={e => set({ overskrift: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Tekst</Label>
            <Textarea value={d.tekst || ""} onChange={e => set({ tekst: e.target.value })} rows={4} />
          </div>
          <div>
            <Label className="text-xs">Stil</Label>
            <Select value={d.stil || "normal"} onValueChange={v => set({ stil: v as "normal" | "fremhævet" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fremhævet">Fremhævet (farvet boks)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground pt-2">Indholdet styres automatisk.</p>;
  }
}

function SortableBlokKort({
  blok,
  onChange,
  onDelete,
  allowImageUpload,
}: {
  blok: Blok;
  onChange: (b: Blok) => void;
  onDelete: () => void;
  allowImageUpload: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = BLOK_META[blok.type];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: blok.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-2 ${blok.skjult ? "opacity-50" : ""}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
              aria-label="Træk for at flytte"
            >
              <GripVertical className="w-5 h-5" />
            </button>

            <div className="text-muted-foreground shrink-0">{meta.ikon}</div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{meta.label}</div>
            </div>

            <button
              onClick={() => onChange({ ...blok, skjult: !blok.skjult })}
              className="text-muted-foreground hover:text-foreground p-1"
              title={blok.skjult ? "Vis blok" : "Skjul blok"}
            >
              {blok.skjult ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive p-1"
              title="Slet blok"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setExpanded(v => !v)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expanded && (
            <BlokInlineEditor
              blok={blok}
              onChange={data => onChange({ ...blok, data })}
              allowImageUpload={allowImageUpload}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BlokEditorProps {
  blokke: Blok[];
  onChange: (blokke: Blok[]) => void;
  allowImageUpload?: boolean;
}

export function BlokEditor({ blokke, onChange, allowImageUpload = false }: BlokEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blokke.findIndex(b => b.id === active.id);
      const newIndex = blokke.findIndex(b => b.id === over.id);
      onChange(arrayMove(blokke, oldIndex, newIndex));
    }
  };

  const handleChange = (index: number, updated: Blok) => {
    const next = [...blokke];
    next[index] = updated;
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(blokke.filter((_, i) => i !== index));
  };

  const handleAdd = (type: BlokType) => {
    onChange([...blokke, newBlok(type)]);
    setPickerOpen(false);
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blokke.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blokke.map((blok, i) => (
            <SortableBlokKort
              key={blok.id}
              blok={blok}
              onChange={updated => handleChange(i, updated)}
              onDelete={() => handleDelete(i)}
              allowImageUpload={allowImageUpload}
            />
          ))}
        </SortableContext>
      </DndContext>

      {blokke.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Ingen blokke endnu — tilføj din første blok nedenfor.
        </p>
      )}

      <Button variant="outline" className="w-full mt-2" onClick={() => setPickerOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Tilføj blok
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vælg bloktype</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {(Object.keys(BLOK_META) as BlokType[]).map(type => {
              const meta = BLOK_META[type];
              return (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="text-primary mt-0.5 shrink-0">{meta.ikon}</div>
                  <div>
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{meta.beskrivelse}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function initBlokke(templateBlokke?: Blok[]): Blok[] {
  if (templateBlokke && templateBlokke.length > 0) return templateBlokke.map(b => ({ ...b, id: `${b.type}_${Date.now()}_${Math.random()}` }));
  return STANDARD_BLOK_RAEKKEFOELGE.map(type => newBlok(type as BlokType));
}
