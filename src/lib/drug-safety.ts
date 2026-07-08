/**
 * This is a hand-curated safety net, NOT a comprehensive drug-interaction
 * database. It covers a short list of well-established, high-severity
 * combinations that are commonly taught as "never miss these." It does not
 * replace clinical judgment and does not cover most real interactions —
 * a licensed feed (e.g. FDB, Medi-Span) would be needed for that.
 */
export const DRUG_SAFETY_DISCLAIMER =
  "Safety-net check only — covers a small set of well-known high-risk combinations and recorded allergies. Not a substitute for clinical judgment.";

type InteractionRule = {
  groupA: string[];
  groupB: string[];
  description: string;
};

const CRITICAL_INTERACTIONS: InteractionRule[] = [
  {
    groupA: ["warfarin"],
    groupB: ["diclofenac", "ibuprofen", "aspirin", "naproxen", "aceclofenac", "nimesulide", "nsaid"],
    description: "NSAIDs increase bleeding risk with warfarin",
  },
  {
    groupA: ["sildenafil", "tadalafil", "vardenafil"],
    groupB: ["nitroglycerin", "isosorbide", "nitrate"],
    description: "Nitrates + PDE5 inhibitors can cause severe hypotension",
  },
  {
    groupA: ["enalapril", "lisinopril", "ramipril", "telmisartan", "losartan"],
    groupB: ["spironolactone", "amiloride", "potassium"],
    description: "ACE inhibitor/ARB + potassium-sparing agent risks hyperkalaemia",
  },
  {
    groupA: ["methotrexate"],
    groupB: ["diclofenac", "ibuprofen", "aspirin", "naproxen", "nsaid", "trimethoprim", "cotrimoxazole"],
    description: "NSAIDs/trimethoprim increase methotrexate toxicity",
  },
  {
    groupA: ["lithium"],
    groupB: ["diclofenac", "ibuprofen", "naproxen", "nsaid", "hydrochlorothiazide", "enalapril", "lisinopril"],
    description: "NSAIDs/diuretics/ACE inhibitors raise lithium levels",
  },
  {
    groupA: ["digoxin"],
    groupB: ["amiodarone", "clarithromycin", "erythromycin", "verapamil"],
    description: "Raises digoxin levels — risk of digoxin toxicity",
  },
  {
    groupA: ["atorvastatin", "simvastatin", "rosuvastatin"],
    groupB: ["clarithromycin", "erythromycin", "itraconazole", "ketoconazole"],
    description: "Increases statin levels — risk of myopathy/rhabdomyolysis",
  },
  {
    groupA: ["sertraline", "fluoxetine", "paroxetine", "escitalopram"],
    groupB: ["tramadol", "sumatriptan", "linezolid"],
    description: "Combined serotonergic drugs risk serotonin syndrome",
  },
  {
    groupA: ["metronidazole", "tinidazole"],
    groupB: ["alcohol", "warfarin"],
    description: "Metronidazole with alcohol causes a disulfiram-like reaction; with warfarin, increases bleeding risk",
  },
  {
    groupA: ["glimepiride", "glipizide", "gliclazide"],
    groupB: ["diclofenac", "ibuprofen", "nsaid", "cotrimoxazole", "trimethoprim"],
    description: "Increases hypoglycaemia risk with sulfonylureas",
  },
];

function normalize(name: string): string {
  return name.toLowerCase();
}

function matchesGroup(medicineName: string, group: string[]): boolean {
  const n = normalize(medicineName);
  return group.some((term) => n.includes(term));
}

export type SafetyWarning =
  | { type: "allergy"; medicine: string; note: string }
  | { type: "interaction"; medicineA: string; medicineB: string; description: string };

export function checkAllergyConflicts(
  medicineNames: string[],
  allergyText: string | null | undefined,
): SafetyWarning[] {
  if (!allergyText?.trim()) return [];
  const allergyTerms = allergyText
    .toLowerCase()
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const warnings: SafetyWarning[] = [];
  for (const medicineName of medicineNames) {
    const n = normalize(medicineName);
    const hit = allergyTerms.find((term) => n.includes(term) || term.includes(n));
    if (hit) {
      warnings.push({
        type: "allergy",
        medicine: medicineName,
        note: `Patient's recorded allergy ("${hit}") matches this medicine`,
      });
    }
  }
  return warnings;
}

export function checkCriticalInteractions(medicineNames: string[]): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  for (let i = 0; i < medicineNames.length; i++) {
    for (let j = i + 1; j < medicineNames.length; j++) {
      const a = medicineNames[i];
      const b = medicineNames[j];
      for (const rule of CRITICAL_INTERACTIONS) {
        const aMatchesA = matchesGroup(a, rule.groupA);
        const bMatchesB = matchesGroup(b, rule.groupB);
        const aMatchesB = matchesGroup(a, rule.groupB);
        const bMatchesA = matchesGroup(b, rule.groupA);
        if ((aMatchesA && bMatchesB) || (aMatchesB && bMatchesA)) {
          warnings.push({
            type: "interaction",
            medicineA: a,
            medicineB: b,
            description: rule.description,
          });
        }
      }
    }
  }
  return warnings;
}

export function checkDrugSafety(
  medicineNames: string[],
  allergyText: string | null | undefined,
): SafetyWarning[] {
  return [
    ...checkAllergyConflicts(medicineNames, allergyText),
    ...checkCriticalInteractions(medicineNames),
  ];
}
