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
  Image, Type, Star, MapPin, DollarSign, AlertTriangle, Phone, Zap, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export const BLOK_META: Record<BlokType, { label: string; beskrivelse: string; ikon: React.ReactNode; farve: string }> = {
  hero:           { label: "Hero-sektion",           beskrivelse: "Stor overskrift og undertitel øverst i tilbuddet", ikon: <Zap className="w-4 h-4" />,          farve: "bg-blue-50 border-blue-200 text-blue-700" },
  fordele:        { label: "Fordele-kort",            beskrivelse: "Tilpasselige fordele-kort med ikon, titel og beskrivelse", ikon: <Star className="w-4 h-4" />,  farve: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  lokationer:     { label: "Lokationer & produkter", beskrivelse: "Produktliste opdelt på rum/lokationer", ikon: <MapPin className="w-4 h-4" />,                    farve: "bg-green-50 border-green-200 text-green-700" },
  prissummary:    { label: "Prisoversigt",            beskrivelse: "Samlet pris ekskl./inkl. moms beregnet automatisk", ikon: <DollarSign className="w-4 h-4" />,   farve: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  forbehold:      { label: "Forbehold",               beskrivelse: "Tilbudsspecifikke bemærkninger og standardforbehold", ikon: <AlertTriangle className="w-4 h-4" />, farve: "bg-amber-50 border-amber-200 text-amber-700" },
  cta:            { label: "Call to action",          beskrivelse: "Fremhævet boks med opfordring til kontakt", ikon: <Phone className="w-4 h-4" />,                 farve: "bg-purple-50 border-purple-200 text-purple-700" },
  kontaktperson:  { label: "Kontaktperson",           beskrivelse: "Navn, titel, telefon og e-mail på kontaktperson", ikon: <Phone className="w-4 h-4" />,           farve: "bg-pink-50 border-pink-200 text-pink-700" },
  custom_billede: { label: "Billede",                 beskrivelse: "Indsæt et billede med valgfri billedtekst", ikon: <Image className="w-4 h-4" />,                 farve: "bg-slate-50 border-slate-200 text-slate-700" },
  custom_tekst:   { label: "Fritekst",                beskrivelse: "Fritekst-afsnit med overskrift og valgfri fremhævning", ikon: <Type className="w-4 h-4" />,      farve: "bg-slate-50 border-slate-200 text-slate-700" },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newBlok(type: BlokType): Blok {
  return { id: `${type}_${uid()}`, type };
}

type FordelKort = { ikon?: string; titel: string; tekst?: string };

const DEFAULT_FORDELE: FordelKort[] = [
  { ikon: "⚡", titel: "Hurtig levering", tekst: "Vi tilpasser tidsplanen til Jeres drift og sikrer minimal afbrydelse" },
  { ikon: "🏅", titel: "Certificeret kvalitet", tekst: "Autoriserede el-installatører med dokumenteret erhvervserfaring" },
  { ikon: "🛡️", titel: "Garanti & service", tekst: "Fuld garanti på arbejde og materialer samt efterfølgende support" },
];

function FordeleEditor({ d, set }: { d: BlokData; set: (patch: Partial<BlokData>) => void }) {
  const kort: FordelKort[] = d.kort && d.kort.length > 0 ? d.kort : DEFAULT_FORDELE;

  const updateKort = (i: number, patch: Partial<FordelKort>) => {
    const next = kort.map((k, idx) => idx === i ? { ...k, ...patch } : k);
    set({ kort: next });
  };

  const addKort = () => set({ kort: [...kort, { ikon: "", titel: "", tekst: "" }] });
  const removeKort = (i: number) => set({ kort: kort.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3 pt-2">
      {kort.map((k, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kort {i + 1}</span>
            <button
              onClick={() => removeKort(i)}
              className="text-muted-foreground hover:text-destructive"
              title="Fjern kort"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="w-16">
              <Label className="text-xs">Ikon</Label>
              <Input
                value={k.ikon || ""}
                onChange={e => updateKort(i, { ikon: e.target.value })}
                placeholder="⚡"
                className="text-center text-lg h-9"
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Titel</Label>
              <Input
                value={k.titel || ""}
                onChange={e => updateKort(i, { titel: e.target.value })}
                placeholder="Fordel titel"
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Beskrivelse</Label>
            <Input
              value={k.tekst || ""}
              onChange={e => updateKort(i, { tekst: e.target.value })}
              placeholder="Kort beskrivelse..."
              className="h-9"
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addKort} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1" />
        Tilføj kort
      </Button>
    </div>
  );
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
        <div className="space-y-3 pt-3 border-t mt-3">
          <div>
            <Label className="text-xs">Overskrift</Label>
            <Input
              value={d.overskrift || ""}
              onChange={e => set({ overskrift: e.target.value })}
              placeholder="Tilbuddets projektnavn bruges som fallback"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Underoverskrift</Label>
            <Textarea
              value={d.underoverskrift || ""}
              onChange={e => set({ underoverskrift: e.target.value })}
              rows={2}
              placeholder="Vi præsenterer hermed vores tilbud..."
              className="mt-1 resize-none"
            />
          </div>
          <div>
            <Label className="text-xs">Billede-URL (valgfri)</Label>
            <Input
              value={d.billedeUrl || ""}
              onChange={e => set({ billedeUrl: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>
      );

    case "fordele":
      return (
        <div className="pt-3 border-t mt-3">
          <FordeleEditor d={d} set={set} />
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3 pt-3 border-t mt-3">
          <div>
            <Label className="text-xs">Overskrift</Label>
            <Input
              value={d.ctaOverskrift || ""}
              onChange={e => set({ ctaOverskrift: e.target.value })}
              placeholder="Klar til at komme i gang?"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Brødtekst</Label>
            <Textarea
              value={d.ctaTekst || ""}
              onChange={e => set({ ctaTekst: e.target.value })}
              rows={2}
              placeholder="Kontakt os i dag for at aftale næste skridt..."
              className="mt-1 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">Telefon og e-mail hentes fra firmaprofil-indstillingerne.</p>
          </div>
        </div>
      );

    case "kontaktperson":
      return (
        <div className="pt-3 border-t mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Navn</Label>
              <Input value={d.navn || ""} onChange={e => set({ navn: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Titel / stilling</Label>
              <Input value={d.titel || ""} onChange={e => set({ titel: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={d.telefon || ""} onChange={e => set({ telefon: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={d.email || ""} onChange={e => set({ email: e.target.value })} className="mt-1" />
            </div>
          </div>
        </div>
      );

    case "custom_billede":
      return (
        <div className="space-y-3 pt-3 border-t mt-3">
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
              <div>
                <Label className="text-xs">Billede</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Image className="w-4 h-4 mr-2" />
                    {d.src ? "Skift billede" : "Vælg billede"}
                  </Button>
                  {d.src && (
                    <button onClick={() => set({ src: undefined })} className="text-xs text-muted-foreground hover:text-destructive">
                      Fjern
                    </button>
                  )}
                </div>
                {d.src && <img src={d.src} alt="" className="mt-2 max-h-28 rounded border object-contain" />}
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Billedtekst (valgfri)</Label>
            <Input value={d.billedeTekst || ""} onChange={e => set({ billedeTekst: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Bredde</Label>
            <Select value={d.bredde || "indhold"} onValueChange={v => set({ bredde: v as "fuld" | "indhold" })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indhold">Indhold (centreret)</SelectItem>
                <SelectItem value="fuld">Fuld bredde</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "custom_tekst":
      return (
        <div className="space-y-3 pt-3 border-t mt-3">
          <div>
            <Label className="text-xs">Overskrift (valgfri)</Label>
            <Input value={d.overskrift || ""} onChange={e => set({ overskrift: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tekst</Label>
            <Textarea value={d.tekst || ""} onChange={e => set({ tekst: e.target.value })} rows={4} className="mt-1 resize-none" />
          </div>
          <div>
            <Label className="text-xs">Stil</Label>
            <Select value={d.stil || "normal"} onValueChange={v => set({ stil: v as "normal" | "fremhævet" })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fremhævet">Fremhævet (farvet boks)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "lokationer":
    case "prissummary":
    case "forbehold":
      return (
        <div className="pt-3 border-t mt-3">
          <p className="text-xs text-muted-foreground">Indholdet beregnes og hentes automatisk fra tilbuddet.</p>
        </div>
      );

    default:
      return null;
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
    opacity: isDragging ? 0.4 : 1,
  };

  const hasEditor = ["hero", "fordele", "cta", "kontaktperson", "custom_billede", "custom_tekst"].includes(blok.type);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-2 transition-opacity ${blok.skjult ? "opacity-40" : ""}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 min-h-[36px]">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0 p-1 -ml-1"
              aria-label="Træk for at flytte"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Blok-type badge */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium shrink-0 ${meta.farve}`}>
              {meta.ikon}
              <span>{meta.label}</span>
            </div>

            {blok.skjult && (
              <Badge variant="outline" className="text-xs text-muted-foreground">skjult</Badge>
            )}

            <div className="flex-1" />

            {/* Skjul/vis */}
            <button
              onClick={() => onChange({ ...blok, skjult: !blok.skjult })}
              className="text-muted-foreground hover:text-foreground p-1 shrink-0"
              title={blok.skjult ? "Vis blok" : "Skjul blok"}
            >
              {blok.skjult ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Slet */}
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive p-1 shrink-0"
              title="Fjern blok"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Udvid (kun for blokke med editor) */}
            {hasEditor && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                title={expanded ? "Luk editor" : "Rediger blok"}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {expanded && hasEditor && (
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
        <p className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
          Ingen blokke endnu — klik "Tilføj blok" for at komme i gang.
        </p>
      )}

      <Button variant="outline" className="w-full mt-3 h-10" onClick={() => setPickerOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Tilføj blok
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Tilføj blok</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(Object.keys(BLOK_META) as BlokType[]).map(type => {
              const meta = BLOK_META[type];
              return (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary hover:bg-muted/50 text-left transition-colors group"
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-md border shrink-0 mt-0.5 ${meta.farve}`}>
                    {meta.ikon}
                  </div>
                  <div>
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{meta.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.beskrivelse}</div>
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
  if (templateBlokke && templateBlokke.length > 0) {
    return templateBlokke.map(b => ({ ...b, id: `${b.type}_${uid()}` }));
  }
  return STANDARD_BLOK_RAEKKEFOELGE.map(type => newBlok(type as BlokType));
}
