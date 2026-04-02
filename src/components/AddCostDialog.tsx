import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { CustomCost } from "@/hooks/use-custom-costs";

interface AddCostDialogProps {
  onAdd: (cost: Omit<CustomCost, "id">) => void;
}

export function AddCostDialog({ onAdd }: AddCostDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lo, setLo] = useState("");
  const [hi, setHi] = useState("");
  const [type, setType] = useState<"onetime" | "monthly">("monthly");

  const reset = () => { setName(""); setLo(""); setHi(""); setType("monthly"); };

  const handleSubmit = () => {
    const loNum = Math.max(0, Number(lo) || 0);
    const hiNum = Math.max(loNum, Number(hi) || loNum);
    if (!name.trim()) return;
    onAdd({ name: name.trim(), lo: loNum, hi: hiNum, type });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent text-accent-foreground text-[10px] font-semibold hover:opacity-80 transition-opacity">
          <Plus className="w-3 h-3" /> Add custom cost
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Add custom cost</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[10px] font-medium text-foreground-secondary block mb-1">Cost name</label>
            <input
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="e.g. Marketing budget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-foreground-secondary block mb-1">Low ($)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="0"
                value={lo}
                onChange={(e) => setLo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-foreground-secondary block mb-1">High ($)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="0"
                value={hi}
                onChange={(e) => setHi(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-foreground-secondary block mb-1">Cost type</label>
            <div className="flex gap-2">
              {(["onetime", "monthly"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold border transition-colors ${
                    type === t
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background text-foreground-secondary border-border hover:border-foreground-muted"
                  }`}
                >
                  {t === "onetime" ? "One-time" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <button className="px-3 py-1.5 rounded-md text-[10px] font-medium text-foreground-secondary hover:text-foreground">Cancel</button>
            </DialogClose>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-[10px] font-semibold hover:opacity-80 disabled:opacity-40"
            >
              Add cost
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
