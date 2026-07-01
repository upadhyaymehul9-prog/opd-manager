import type { Medicine } from "@/lib/prescription-types";

export function formatMedicineLabel(m: {
  name: string;
  brand?: string | null;
  strength?: string | null;
  form?: string | null;
}): string {
  const parts = [m.name];
  if (m.strength) parts.push(m.strength);
  let label = parts.join(" ");
  if (m.brand) label += ` (${m.brand})`;
  if (m.form) label += ` · ${m.form}`;
  return label;
}

export function medicineMatchesQuery(
  m: Medicine,
  q: string,
): boolean {
  const needle = q.toLowerCase();
  return (
    m.name.toLowerCase().includes(needle) ||
    (m.brand?.toLowerCase().includes(needle) ?? false) ||
    (m.strength?.toLowerCase().includes(needle) ?? false) ||
    (m.form?.toLowerCase().includes(needle) ?? false)
  );
}
