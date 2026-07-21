"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LabTestCatalogItem,
  VisitLabTestItem,
} from "@/lib/lab-test-types";
import { formatLabValue } from "@/lib/lab-tests";
import { LAB_PANELS, getLabPanel } from "@/lib/lab-panels";

type LabTestsPanelProps = {
  visitId: string;
  /** Doctor can order; lab can order ad-hoc tests too */
  canOrder?: boolean;
  /** Lab staff enter result values */
  canEnterResults?: boolean;
  compact?: boolean;
};

export function LabTestsPanel({
  visitId,
  canOrder = false,
  canEnterResults = false,
  compact = false,
}: LabTestsPanelProps) {
  const [tests, setTests] = useState<VisitLabTestItem[]>([]);
  const [catalog, setCatalog] = useState<LabTestCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [selectedPanel, setSelectedPanel] = useState("");
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { value_numeric: string; value_text: string; notes: string }>
  >({});

  const loadTests = useCallback(async () => {
    const res = await fetch(`/api/visits/${visitId}/lab-tests`);
    if (!res.ok) throw new Error("Could not load lab tests");
    const data = await res.json();
    setTests(Array.isArray(data) ? data : []);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const t of data as VisitLabTestItem[]) {
        if (!next[t.id]) {
          next[t.id] = {
            value_numeric:
              t.value_numeric != null ? String(t.value_numeric) : "",
            value_text: t.value_text ?? "",
            notes: t.notes ?? "",
          };
        }
      }
      return next;
    });
  }, [visitId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadTests(),
      fetch("/api/lab-tests/catalog")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setCatalog(Array.isArray(d) ? d : [])),
    ])
      .catch(() => setError("Could not load lab data"))
      .finally(() => setLoading(false));
  }, [loadTests]);

  const filteredCatalog = catalog.filter((c) =>
    !query.trim() || c.name.toLowerCase().includes(query.toLowerCase()),
  );

  async function addTest() {
    const catalogItem = catalog.find((c) => c.id === selectedCatalogId);
    const testName = catalogItem?.name || customName.trim();
    if (!testName) {
      setError("Select or type a test name");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lab-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalog_id: catalogItem?.id ?? null,
          test_name: testName,
          unit: catalogItem?.unit ?? null,
          ref_range: catalogItem?.ref_range ?? null,
          value_type: catalogItem?.value_type ?? "numeric",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add test");
      setQuery("");
      setCustomName("");
      setSelectedCatalogId("");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add test");
    } finally {
      setBusy(false);
    }
  }

  async function addPanel() {
    const panel = getLabPanel(selectedPanel);
    if (!panel) {
      setError("Pick a report panel first");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lab-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: panel.components.map((c) => ({
            test_name: c.name,
            unit: c.unit,
            ref_range: c.ref_range,
            value_type: c.value_type,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add panel");
      setSelectedPanel("");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add panel");
    } finally {
      setBusy(false);
    }
  }

  async function saveResult(test: VisitLabTestItem) {
    const draft = drafts[test.id];
    if (!draft) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lab-tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value_numeric:
            test.value_type !== "text" && draft.value_numeric !== ""
              ? Number(draft.value_numeric)
              : null,
          value_text:
            test.value_type !== "numeric" ? draft.value_text || null : null,
          notes: draft.notes || null,
          status: "resulted",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save result");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save result");
    } finally {
      setBusy(false);
    }
  }

  async function markCollected(testId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lab-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "collected" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not mark collected");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark collected");
    } finally {
      setBusy(false);
    }
  }

  async function removeTest(testId: string) {
    if (!window.confirm("Cancel this lab test order?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/lab-tests/${testId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove test");
      await loadTests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove test");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-600">
        Loading lab tests…
      </p>
    );
  }

  return (
    <section
      className={`rounded-xl border border-emerald-200 bg-white shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-emerald-900">Lab tests &amp; results</h3>
          <p className="text-xs text-slate-600">
            Structured tests with values · visible to doctor on return
          </p>
        </div>
        {tests.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {tests.filter((t) => t.status === "resulted").length}/{tests.length} resulted
          </span>
        )}
      </div>

      {canOrder && (
        <div className="mt-3 space-y-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
          <p className="text-xs font-medium text-violet-900">
            Add full report panel — expands into every component with reference ranges
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedPanel}
              onChange={(e) => setSelectedPanel(e.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pick a report panel (CBC, LFT, KFT…)</option>
              {Array.from(new Set(LAB_PANELS.map((p) => p.category))).map(
                (category) => (
                  <optgroup key={category} label={category}>
                    {LAB_PANELS.filter((p) => p.category === category).map(
                      (p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} ({p.components.length})
                        </option>
                      ),
                    )}
                  </optgroup>
                ),
              )}
            </select>
            <button
              type="button"
              onClick={addPanel}
              disabled={busy || !selectedPanel}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Add panel
            </button>
          </div>
        </div>
      )}

      {canOrder && (
        <div className="mt-3 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-xs font-medium text-emerald-900">
            Add single test
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedCatalogId("");
              }}
              placeholder="Search CBC, LFT, Hb…"
              className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={selectedCatalogId}
              onChange={(e) => {
                setSelectedCatalogId(e.target.value);
                const item = catalog.find((c) => c.id === e.target.value);
                if (item) setCustomName(item.name);
              }}
              className="min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pick from catalog…</option>
              {filteredCatalog.slice(0, 30).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.unit ? ` (${c.unit})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Or type custom test name"
              className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTest}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add test
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tests.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No lab tests added yet.
          {canOrder ? " Add tests above before sending the patient to lab." : ""}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Test</th>
                <th className="py-2 pr-3">Ref range</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Status</th>
                {(canEnterResults || canOrder) && <th className="py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                const draft = drafts[test.id] ?? {
                  value_numeric: "",
                  value_text: "",
                  notes: "",
                };
                const isResulted = test.status === "resulted";

                return (
                  <tr key={test.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-900">{test.test_name}</p>
                      {test.unit && (
                        <p className="text-xs text-slate-500">Unit: {test.unit}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {test.ref_range || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {canEnterResults && !isResulted ? (
                        <div className="space-y-1">
                          {test.value_type !== "text" && (
                            <input
                              type="number"
                              step="any"
                              value={draft.value_numeric}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [test.id]: {
                                    ...draft,
                                    value_numeric: e.target.value,
                                  },
                                }))
                              }
                              placeholder={test.unit ? `Value (${test.unit})` : "Value"}
                              className="w-full max-w-[140px] rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          )}
                          {test.value_type !== "numeric" && (
                            <input
                              type="text"
                              value={draft.value_text}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [test.id]: {
                                    ...draft,
                                    value_text: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Text result"
                              className="w-full max-w-[180px] rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          )}
                        </div>
                      ) : (
                        <span
                          className={
                            isResulted
                              ? "font-semibold text-emerald-800"
                              : "text-slate-400"
                          }
                        >
                          {formatLabValue(test)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={test.status} />
                    </td>
                    {(canEnterResults || canOrder) && (
                      <td className="py-2">
                        <div className="flex flex-col gap-1">
                          {canEnterResults && test.status === "ordered" && (
                            <button
                              type="button"
                              onClick={() => markCollected(test.id)}
                              disabled={busy}
                              className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            >
                              Sample collected
                            </button>
                          )}
                          {canEnterResults && !isResulted && (
                            <button
                              type="button"
                              onClick={() => saveResult(test)}
                              disabled={busy}
                              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save result
                            </button>
                          )}
                          {canOrder &&
                            (test.status === "ordered" || test.status === "collected") && (
                            <button
                              type="button"
                              onClick={() => removeTest(test.id)}
                              disabled={busy}
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: VisitLabTestItem["status"] }) {
  const styles: Record<VisitLabTestItem["status"], string> = {
    ordered: "bg-amber-100 text-amber-800",
    collected: "bg-blue-100 text-blue-800",
    resulted: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-slate-100 text-slate-600",
  };
  const labels: Record<VisitLabTestItem["status"], string> = {
    ordered: "Ordered",
    collected: "Collected",
    resulted: "Resulted",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
