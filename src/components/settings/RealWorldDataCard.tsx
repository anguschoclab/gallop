import { useRef, useState } from "react";
import { toast } from "sonner";
import { Globe2, Upload, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IMPORT_TEMPLATE_CSV,
  clearImportedDataset,
  importRealWorldText,
  useImportedRealWorld,
} from "@/data/importedRealWorld";

/** Upload real race results, track records and careers for the Almanac and Insights. */
export function RealWorldDataCard() {
  const data = useImportedRealWorld();
  const input = useRef<HTMLInputElement>(null);
  const [merge, setMerge] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);

  const onFile = async (file: File) => {
    try {
      const res = importRealWorldText(await file.text(), file.name, merge ? "merge" : "replace");
      setSkipped(res.skipped);
      toast.success(
        `Imported ${res.records} race times and ${res.careers} careers` +
          (res.skipped.length ? ` (${res.skipped.length} rows skipped)` : ""),
      );
    } catch {
      toast.error("Couldn't read that file. Use CSV or JSON in the template format.");
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE_CSV], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "real-world-racing-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="md:col-span-2 border-gold-muted bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-cream font-[family-name:var(--font-display)]">
          <Globe2 className="h-4 w-4" />
          Real-World Racing Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-cream-muted">
          Upload real race results, track records and horse careers (CSV or JSON). They appear
          alongside the built-in records in the Almanac&apos;s Real World tab and as a “Real world”
          group in Scouting Insights. Stored in this browser only — never part of your save.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.records.length} race times</Badge>
          <Badge variant="outline">{data.careers.length} careers</Badge>
          {data.fileName && (
            <Badge variant="secondary" className="text-[10px]">
              {data.fileName}
            </Badge>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-cream-muted">
          <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
          Add to existing uploads instead of replacing them
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={input}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            aria-label="Upload real-world data file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" className="flex-1 gap-2" onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4" /> Upload file
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download template
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            disabled={!data.records.length && !data.careers.length}
            onClick={() => {
              clearImportedDataset();
              setSkipped([]);
              toast.success("Uploaded real-world data removed");
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
        {skipped.length > 0 && (
          <ul className="max-h-28 overflow-auto text-[11px] text-cream-muted list-disc pl-4">
            {skipped.slice(0, 20).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
