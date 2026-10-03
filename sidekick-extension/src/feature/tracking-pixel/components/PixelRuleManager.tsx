import { useEffect, useState } from "react";
import type { PixelRule } from "../types";
import { getRules, toggleRule as toggleRuleInStore } from "../storage/storage";
import PixelRuleList from "./PixelRuleList";

export default function PixelRuleManager() {
  const [rules, setRules] = useState<PixelRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    setLoading(true);
    try {
      const loaded = await getRules();
      setRules(loaded);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleRuleInStore(id, enabled);
    loadRules();
  };

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-[12px] font-semibold">Tracking Pixel Rules</h3>
      </div>
      {loading ? (
        <div className="p-3 text-center text-[10px] text-muted">Loading...</div>
      ) : (
        <PixelRuleList rules={rules} onToggle={handleToggle} />
      )}
    </div>
  );
}
