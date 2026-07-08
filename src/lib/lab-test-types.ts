export type LabValueType = "numeric" | "text" | "both";

export type VisitLabTestStatus =
  | "ordered"
  | "collected"
  | "resulted"
  | "cancelled";

export type LabTestCatalogItem = {
  id: string;
  name: string;
  unit: string | null;
  ref_range: string | null;
  value_type: LabValueType;
};

export type VisitLabTestItem = {
  id: string;
  patient_visit_id: string;
  catalog_id: string | null;
  test_name: string;
  unit: string | null;
  ref_range: string | null;
  value_type: LabValueType;
  value_numeric: number | null;
  value_text: string | null;
  status: VisitLabTestStatus;
  notes: string | null;
  ordered_by: string | null;
  ordered_by_role: string | null;
  ordered_at: string;
  resulted_at: string | null;
  resulted_by: string | null;
  resulted_by_role: string | null;
  sort_order: number;
};

export type VisitLabTestInput = {
  catalog_id?: string | null;
  test_name: string;
  unit?: string | null;
  ref_range?: string | null;
  value_type?: LabValueType;
};

export type VisitLabTestResultInput = {
  value_numeric?: number | null;
  value_text?: string | null;
  notes?: string | null;
  status?: VisitLabTestStatus;
};
