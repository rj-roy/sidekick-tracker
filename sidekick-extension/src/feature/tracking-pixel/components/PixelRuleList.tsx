import type { PixelRule } from "../types";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface PixelRuleListProps {
  rules: PixelRule[];
  onToggle: (id: string, enabled: boolean) => void;
}

export default function PixelRuleList({ rules, onToggle }: PixelRuleListProps) {
  if (rules.length === 0) {
    return (
      <div className="p-3 text-center text-[10px] text-muted">
        No tracking pixel rules configured.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rules.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between p-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium truncate">{rule.name}</span>
              <span className={`text-[9px] px-1 py-0.5 rounded ${rule.enabled ? "bg-success-soft text-success" : "bg-muted/10 text-muted"}`}>
                {rule.enabled ? "ON" : "OFF"}
              </span>
            </div>
            <div className="text-[9px] text-muted truncate mt-0.5">
              {rule.pixelUrl}
            </div>
            <div className="text-[9px] text-muted mt-0.5">
              {rule.fireOn}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onToggle(rule.id, !rule.enabled)}
              className="p-1 hover:bg-page rounded"
              title={rule.enabled ? "Disable" : "Enable"}
            >
              {rule.enabled ? <ToggleRight className="size-3 text-success" /> : <ToggleLeft className="size-3 text-muted" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
