export type Icd10Entry = {
  /** ICD-10 code, e.g. "J02.9" */
  code: string;
  /** Official-style short description shown to the doctor */
  description: string;
  /** Grouping used for browsing/reporting */
  category: string;
  /** Alternate names / Indian-OPD shorthand that should match in search */
  aliases: string[];
};

/**
 * Curated subset of ICD-10 codes covering the diagnoses most commonly seen in
 * an Indian outpatient clinic (NABH IMS.1d — diagnoses coded using ICD-10).
 *
 * This is deliberately NOT a full ICD-10 terminology — the full set is ~70k
 * codes and needs licensing/tooling we don't want. Free-text diagnosis stays
 * available as a fallback; this list only powers the autocomplete. Same
 * static-constant pattern as LAB_PANELS in src/lib/lab-panels.ts.
 */
export const ICD10_CODES: Icd10Entry[] = [
  // ── Symptoms & general ──────────────────────────────────────────────
  { code: "R50.9", description: "Fever, unspecified", category: "Symptoms & general", aliases: ["pyrexia", "bukhar"] },
  { code: "R51", description: "Headache", category: "Symptoms & general", aliases: ["cephalgia", "sar dard"] },
  { code: "R05", description: "Cough", category: "Symptoms & general", aliases: ["khansi"] },
  { code: "R06.0", description: "Dyspnoea", category: "Symptoms & general", aliases: ["breathlessness", "shortness of breath", "saans"] },
  { code: "R07.9", description: "Chest pain, unspecified", category: "Symptoms & general", aliases: ["chest discomfort"] },
  { code: "R10.4", description: "Other and unspecified abdominal pain", category: "Symptoms & general", aliases: ["stomach ache", "pet dard", "abdominal pain"] },
  { code: "R11", description: "Nausea and vomiting", category: "Symptoms & general", aliases: ["ulti", "emesis"] },
  { code: "R42", description: "Dizziness and giddiness", category: "Symptoms & general", aliases: ["vertigo symptom", "chakkar"] },
  { code: "R53", description: "Malaise and fatigue", category: "Symptoms & general", aliases: ["weakness", "kamzori", "tiredness"] },
  { code: "R55", description: "Syncope and collapse", category: "Symptoms & general", aliases: ["fainting", "behoshi"] },
  { code: "R60.9", description: "Oedema, unspecified", category: "Symptoms & general", aliases: ["swelling", "edema"] },
  { code: "R63.0", description: "Anorexia (loss of appetite)", category: "Symptoms & general", aliases: ["bhookh nahi"] },
  { code: "R63.4", description: "Abnormal weight loss", category: "Symptoms & general", aliases: ["weight loss"] },
  { code: "R21", description: "Rash and other nonspecific skin eruption", category: "Symptoms & general", aliases: ["skin rash"] },
  { code: "R25.2", description: "Cramp and spasm", category: "Symptoms & general", aliases: ["muscle cramps"] },
  { code: "R56.8", description: "Other and unspecified convulsions", category: "Symptoms & general", aliases: ["seizure", "fits", "daura"] },

  // ── Infectious diseases ─────────────────────────────────────────────
  { code: "B34.9", description: "Viral infection, unspecified (viral fever)", category: "Infections", aliases: ["viral fever", "viral illness"] },
  { code: "J11.1", description: "Influenza with other respiratory manifestations, virus not identified", category: "Infections", aliases: ["flu", "influenza"] },
  { code: "A90", description: "Dengue fever (classical dengue)", category: "Infections", aliases: ["dengue"] },
  { code: "A91", description: "Dengue haemorrhagic fever", category: "Infections", aliases: ["dhf", "severe dengue"] },
  { code: "B50.9", description: "Plasmodium falciparum malaria, unspecified", category: "Infections", aliases: ["falciparum malaria"] },
  { code: "B51.9", description: "Plasmodium vivax malaria without complication", category: "Infections", aliases: ["vivax malaria", "malaria"] },
  { code: "B54", description: "Unspecified malaria", category: "Infections", aliases: ["malaria fever"] },
  { code: "A01.0", description: "Typhoid fever", category: "Infections", aliases: ["typhoid", "enteric fever"] },
  { code: "A92.0", description: "Chikungunya virus disease", category: "Infections", aliases: ["chikungunya"] },
  { code: "B26.9", description: "Mumps without complication", category: "Infections", aliases: ["mumps"] },
  { code: "B01.9", description: "Varicella without complication (chickenpox)", category: "Infections", aliases: ["chickenpox", "chicken pox"] },
  { code: "B05.9", description: "Measles without complication", category: "Infections", aliases: ["measles", "khasra"] },
  { code: "B02.9", description: "Zoster without complication (herpes zoster)", category: "Infections", aliases: ["shingles", "herpes zoster"] },
  { code: "B00.9", description: "Herpesviral infection, unspecified", category: "Infections", aliases: ["herpes simplex"] },
  { code: "A09", description: "Infectious gastroenteritis and colitis, unspecified", category: "Infections", aliases: ["gastroenteritis", "loose motions", "diarrhoea infective", "food poisoning"] },
  { code: "A06.0", description: "Acute amoebic dysentery", category: "Infections", aliases: ["amoebiasis", "amebic dysentery"] },
  { code: "A03.9", description: "Shigellosis, unspecified (bacillary dysentery)", category: "Infections", aliases: ["dysentery"] },
  { code: "B15.9", description: "Hepatitis A without hepatic coma", category: "Infections", aliases: ["hepatitis a", "jaundice infective"] },
  { code: "B16.9", description: "Acute hepatitis B without delta-agent and without hepatic coma", category: "Infections", aliases: ["hepatitis b"] },
  { code: "B17.1", description: "Acute hepatitis C", category: "Infections", aliases: ["hepatitis c"] },
  { code: "A15.0", description: "Tuberculosis of lung, confirmed", category: "Infections", aliases: ["pulmonary tb", "tb lung", "koch's"] },
  { code: "A16.9", description: "Respiratory tuberculosis unspecified, without bacteriological confirmation", category: "Infections", aliases: ["tb suspected", "tuberculosis"] },
  { code: "A18.0", description: "Tuberculosis of bones and joints", category: "Infections", aliases: ["skeletal tb", "pott's spine"] },
  { code: "B86", description: "Scabies", category: "Infections", aliases: ["khujli", "scabies infestation"] },
  { code: "B76.9", description: "Hookworm disease, unspecified", category: "Infections", aliases: ["hookworm"] },
  { code: "B80", description: "Enterobiasis (pinworm)", category: "Infections", aliases: ["threadworm", "pinworm"] },
  { code: "B77.9", description: "Ascariasis, unspecified (roundworm)", category: "Infections", aliases: ["worms", "roundworm", "deworming"] },
  { code: "B37.9", description: "Candidiasis, unspecified", category: "Infections", aliases: ["candida", "fungal infection candidal"] },
  { code: "B35.9", description: "Dermatophytosis, unspecified (ringworm)", category: "Infections", aliases: ["ringworm", "tinea", "daad", "fungal skin infection"] },
  { code: "A75.9", description: "Typhus fever, unspecified (incl. scrub typhus, unspecified)", category: "Infections", aliases: ["scrub typhus", "typhus"] },
  { code: "B27.9", description: "Infectious mononucleosis, unspecified", category: "Infections", aliases: ["mono", "glandular fever"] },
  { code: "A38", description: "Scarlet fever", category: "Infections", aliases: ["scarlatina"] },
  { code: "U07.1", description: "COVID-19, virus identified", category: "Infections", aliases: ["covid", "corona", "sars-cov-2"] },

  // ── Respiratory & ENT ───────────────────────────────────────────────
  { code: "J00", description: "Acute nasopharyngitis (common cold)", category: "Respiratory & ENT", aliases: ["common cold", "cold", "coryza", "zukam"] },
  { code: "J02.9", description: "Acute pharyngitis, unspecified", category: "Respiratory & ENT", aliases: ["sore throat", "throat pain", "pharyngitis"] },
  { code: "J03.9", description: "Acute tonsillitis, unspecified", category: "Respiratory & ENT", aliases: ["tonsillitis"] },
  { code: "J04.0", description: "Acute laryngitis", category: "Respiratory & ENT", aliases: ["laryngitis", "hoarseness infective"] },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory & ENT", aliases: ["urti", "uri", "upper respiratory tract infection"] },
  { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Respiratory & ENT", aliases: ["bronchitis", "chest infection"] },
  { code: "J18.9", description: "Pneumonia, unspecified organism", category: "Respiratory & ENT", aliases: ["pneumonia", "lrti"] },
  { code: "J21.9", description: "Acute bronchiolitis, unspecified", category: "Respiratory & ENT", aliases: ["bronchiolitis"] },
  { code: "J45.9", description: "Asthma, unspecified", category: "Respiratory & ENT", aliases: ["asthma", "wheeze", "dama"] },
  { code: "J44.9", description: "Chronic obstructive pulmonary disease, unspecified", category: "Respiratory & ENT", aliases: ["copd", "chronic bronchitis smoker"] },
  { code: "J44.1", description: "COPD with acute exacerbation", category: "Respiratory & ENT", aliases: ["copd exacerbation", "aecopd"] },
  { code: "J30.4", description: "Allergic rhinitis, unspecified", category: "Respiratory & ENT", aliases: ["allergic rhinitis", "allergy nose", "sneezing allergy"] },
  { code: "J31.0", description: "Chronic rhinitis", category: "Respiratory & ENT", aliases: ["chronic rhinitis"] },
  { code: "J01.9", description: "Acute sinusitis, unspecified", category: "Respiratory & ENT", aliases: ["sinusitis"] },
  { code: "J32.9", description: "Chronic sinusitis, unspecified", category: "Respiratory & ENT", aliases: ["chronic sinusitis"] },
  { code: "J35.0", description: "Chronic tonsillitis", category: "Respiratory & ENT", aliases: ["chronic tonsillitis"] },
  { code: "H66.9", description: "Otitis media, unspecified", category: "Respiratory & ENT", aliases: ["ear infection", "otitis media", "kaan dard infection"] },
  { code: "H60.9", description: "Otitis externa, unspecified", category: "Respiratory & ENT", aliases: ["otitis externa", "swimmer's ear"] },
  { code: "H61.2", description: "Impacted cerumen (ear wax)", category: "Respiratory & ENT", aliases: ["ear wax", "wax impaction"] },
  { code: "H92.0", description: "Otalgia (ear pain)", category: "Respiratory & ENT", aliases: ["earache", "kaan dard"] },
  { code: "H81.1", description: "Benign paroxysmal vertigo", category: "Respiratory & ENT", aliases: ["bppv", "positional vertigo"] },
  { code: "R04.0", description: "Epistaxis (nosebleed)", category: "Respiratory & ENT", aliases: ["nosebleed", "nakseer"] },
  { code: "J34.2", description: "Deviated nasal septum", category: "Respiratory & ENT", aliases: ["dns", "septal deviation"] },

  // ── Cardiovascular ──────────────────────────────────────────────────
  { code: "I10", description: "Essential (primary) hypertension", category: "Cardiovascular", aliases: ["hypertension", "htn", "high bp", "bp"] },
  { code: "I11.9", description: "Hypertensive heart disease without heart failure", category: "Cardiovascular", aliases: ["hypertensive heart disease"] },
  { code: "I20.9", description: "Angina pectoris, unspecified", category: "Cardiovascular", aliases: ["angina"] },
  { code: "I25.9", description: "Chronic ischaemic heart disease, unspecified", category: "Cardiovascular", aliases: ["ihd", "cad", "coronary artery disease"] },
  { code: "I21.9", description: "Acute myocardial infarction, unspecified", category: "Cardiovascular", aliases: ["heart attack", "mi", "stemi"] },
  { code: "I50.9", description: "Heart failure, unspecified", category: "Cardiovascular", aliases: ["chf", "ccf", "cardiac failure"] },
  { code: "I48.9", description: "Atrial fibrillation and atrial flutter, unspecified", category: "Cardiovascular", aliases: ["af", "afib", "irregular heartbeat"] },
  { code: "I49.9", description: "Cardiac arrhythmia, unspecified", category: "Cardiovascular", aliases: ["arrhythmia", "palpitations dx"] },
  { code: "I83.9", description: "Varicose veins of lower extremities without ulcer or inflammation", category: "Cardiovascular", aliases: ["varicose veins"] },
  { code: "I80.3", description: "Phlebitis and thrombophlebitis of lower extremities, unspecified", category: "Cardiovascular", aliases: ["dvt suspected", "thrombophlebitis"] },
  { code: "I95.9", description: "Hypotension, unspecified", category: "Cardiovascular", aliases: ["low bp", "hypotension"] },
  { code: "I64", description: "Stroke, not specified as haemorrhage or infarction", category: "Cardiovascular", aliases: ["stroke", "cva", "paralysis attack"] },
  { code: "G45.9", description: "Transient cerebral ischaemic attack, unspecified", category: "Cardiovascular", aliases: ["tia", "mini stroke"] },

  // ── Endocrine & metabolic ───────────────────────────────────────────
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine & metabolic", aliases: ["type 2 diabetes", "dm2", "sugar", "diabetes", "madhumeh"] },
  { code: "E11.2", description: "Type 2 diabetes mellitus with kidney complications", category: "Endocrine & metabolic", aliases: ["diabetic nephropathy"] },
  { code: "E11.4", description: "Type 2 diabetes mellitus with neurological complications", category: "Endocrine & metabolic", aliases: ["diabetic neuropathy"] },
  { code: "E11.3", description: "Type 2 diabetes mellitus with eye complications", category: "Endocrine & metabolic", aliases: ["diabetic retinopathy"] },
  { code: "E10.9", description: "Type 1 diabetes mellitus without complications", category: "Endocrine & metabolic", aliases: ["type 1 diabetes", "dm1", "iddm"] },
  { code: "R73.0", description: "Impaired glucose tolerance (prediabetes)", category: "Endocrine & metabolic", aliases: ["prediabetes", "borderline sugar", "igt"] },
  { code: "E16.2", description: "Hypoglycaemia, unspecified", category: "Endocrine & metabolic", aliases: ["low sugar", "hypoglycemia"] },
  { code: "E78.5", description: "Hyperlipidaemia, unspecified", category: "Endocrine & metabolic", aliases: ["dyslipidemia", "high cholesterol", "lipids"] },
  { code: "E03.9", description: "Hypothyroidism, unspecified", category: "Endocrine & metabolic", aliases: ["hypothyroid", "thyroid low", "thyroid"] },
  { code: "E05.9", description: "Thyrotoxicosis, unspecified (hyperthyroidism)", category: "Endocrine & metabolic", aliases: ["hyperthyroid", "thyroid high"] },
  { code: "E04.9", description: "Nontoxic goitre, unspecified", category: "Endocrine & metabolic", aliases: ["goitre", "goiter", "thyroid swelling"] },
  { code: "E66.9", description: "Obesity, unspecified", category: "Endocrine & metabolic", aliases: ["obese", "overweight", "motapa"] },
  { code: "E55.9", description: "Vitamin D deficiency, unspecified", category: "Endocrine & metabolic", aliases: ["vit d deficiency", "vitamin d low"] },
  { code: "E53.8", description: "Deficiency of other specified B group vitamins (incl. B12)", category: "Endocrine & metabolic", aliases: ["b12 deficiency", "vitamin b12"] },
  { code: "E79.0", description: "Hyperuricaemia without signs of inflammatory arthritis", category: "Endocrine & metabolic", aliases: ["high uric acid", "hyperuricemia"] },
  { code: "E86", description: "Volume depletion (dehydration)", category: "Endocrine & metabolic", aliases: ["dehydration"] },
  { code: "E28.2", description: "Polycystic ovarian syndrome", category: "Endocrine & metabolic", aliases: ["pcos", "pcod"] },

  // ── Gastrointestinal ────────────────────────────────────────────────
  { code: "K29.7", description: "Gastritis, unspecified", category: "Gastrointestinal", aliases: ["gastritis", "acidity", "gas"] },
  { code: "K21.9", description: "Gastro-oesophageal reflux disease without oesophagitis", category: "Gastrointestinal", aliases: ["gerd", "reflux", "heartburn"] },
  { code: "K30", description: "Functional dyspepsia", category: "Gastrointestinal", aliases: ["dyspepsia", "indigestion", "apach"] },
  { code: "K25.9", description: "Gastric ulcer, unspecified", category: "Gastrointestinal", aliases: ["stomach ulcer", "gastric ulcer"] },
  { code: "K26.9", description: "Duodenal ulcer, unspecified", category: "Gastrointestinal", aliases: ["duodenal ulcer", "peptic ulcer"] },
  { code: "K58.9", description: "Irritable bowel syndrome without diarrhoea", category: "Gastrointestinal", aliases: ["ibs", "irritable bowel"] },
  { code: "K59.0", description: "Constipation", category: "Gastrointestinal", aliases: ["kabz", "constipated"] },
  { code: "K59.1", description: "Functional diarrhoea", category: "Gastrointestinal", aliases: ["chronic diarrhoea", "functional loose motion"] },
  { code: "K64.9", description: "Haemorrhoids, unspecified", category: "Gastrointestinal", aliases: ["piles", "hemorrhoids", "bavasir"] },
  { code: "K60.2", description: "Anal fissure, unspecified", category: "Gastrointestinal", aliases: ["fissure", "fissure in ano"] },
  { code: "K61.0", description: "Anal abscess", category: "Gastrointestinal", aliases: ["perianal abscess"] },
  { code: "K35.8", description: "Acute appendicitis, other and unspecified", category: "Gastrointestinal", aliases: ["appendicitis"] },
  { code: "K80.2", description: "Calculus of gallbladder without cholecystitis", category: "Gastrointestinal", aliases: ["gallstone", "cholelithiasis"] },
  { code: "K81.0", description: "Acute cholecystitis", category: "Gastrointestinal", aliases: ["cholecystitis"] },
  { code: "K76.0", description: "Fatty (change of) liver, not elsewhere classified", category: "Gastrointestinal", aliases: ["fatty liver", "nafld", "grade 1 fatty liver"] },
  { code: "K74.6", description: "Other and unspecified cirrhosis of liver", category: "Gastrointestinal", aliases: ["cirrhosis", "cld"] },
  { code: "K92.2", description: "Gastrointestinal haemorrhage, unspecified", category: "Gastrointestinal", aliases: ["gi bleed", "malena"] },
  { code: "R17", description: "Unspecified jaundice", category: "Gastrointestinal", aliases: ["jaundice", "piliya"] },
  { code: "K40.9", description: "Unilateral or unspecified inguinal hernia, without obstruction or gangrene", category: "Gastrointestinal", aliases: ["inguinal hernia", "hernia"] },
  { code: "K42.9", description: "Umbilical hernia without obstruction or gangrene", category: "Gastrointestinal", aliases: ["umbilical hernia"] },
  { code: "K12.0", description: "Recurrent oral aphthae (mouth ulcers)", category: "Gastrointestinal", aliases: ["mouth ulcer", "aphthous ulcer", "muh ke chhale"] },
  { code: "K02.9", description: "Dental caries, unspecified", category: "Gastrointestinal", aliases: ["tooth decay", "cavity", "dental caries"] },
  { code: "K04.7", description: "Periapical abscess without sinus", category: "Gastrointestinal", aliases: ["dental abscess", "tooth abscess"] },

  // ── Musculoskeletal ─────────────────────────────────────────────────
  { code: "M54.5", description: "Low back pain", category: "Musculoskeletal", aliases: ["lbp", "backache", "kamar dard", "lumbago"] },
  { code: "M54.2", description: "Cervicalgia (neck pain)", category: "Musculoskeletal", aliases: ["neck pain", "gardan dard"] },
  { code: "M47.9", description: "Spondylosis, unspecified", category: "Musculoskeletal", aliases: ["cervical spondylosis", "spondylosis"] },
  { code: "M51.2", description: "Other specified intervertebral disc displacement", category: "Musculoskeletal", aliases: ["slipped disc", "disc prolapse", "pivd"] },
  { code: "M54.4", description: "Lumbago with sciatica", category: "Musculoskeletal", aliases: ["sciatica"] },
  { code: "M17.9", description: "Gonarthrosis (knee osteoarthritis), unspecified", category: "Musculoskeletal", aliases: ["knee oa", "knee arthritis", "ghutne ka dard"] },
  { code: "M19.9", description: "Arthrosis, unspecified (osteoarthritis)", category: "Musculoskeletal", aliases: ["osteoarthritis", "oa"] },
  { code: "M06.9", description: "Rheumatoid arthritis, unspecified", category: "Musculoskeletal", aliases: ["ra", "rheumatoid"] },
  { code: "M10.9", description: "Gout, unspecified", category: "Musculoskeletal", aliases: ["gout", "gouty arthritis"] },
  { code: "M25.5", description: "Pain in joint", category: "Musculoskeletal", aliases: ["arthralgia", "joint pain", "jodo ka dard"] },
  { code: "M79.1", description: "Myalgia", category: "Musculoskeletal", aliases: ["muscle pain", "body ache", "badan dard"] },
  { code: "M75.1", description: "Rotator cuff syndrome", category: "Musculoskeletal", aliases: ["shoulder impingement", "rotator cuff"] },
  { code: "M75.0", description: "Adhesive capsulitis of shoulder (frozen shoulder)", category: "Musculoskeletal", aliases: ["frozen shoulder", "periarthritis shoulder"] },
  { code: "M77.1", description: "Lateral epicondylitis (tennis elbow)", category: "Musculoskeletal", aliases: ["tennis elbow"] },
  { code: "M65.9", description: "Synovitis and tenosynovitis, unspecified", category: "Musculoskeletal", aliases: ["tenosynovitis"] },
  { code: "M72.2", description: "Plantar fascial fibromatosis (plantar fasciitis)", category: "Musculoskeletal", aliases: ["plantar fasciitis", "heel pain"] },
  { code: "M81.9", description: "Osteoporosis without pathological fracture, unspecified", category: "Musculoskeletal", aliases: ["osteoporosis", "weak bones"] },
  { code: "G56.0", description: "Carpal tunnel syndrome", category: "Musculoskeletal", aliases: ["cts", "carpal tunnel"] },

  // ── Injuries & external causes ──────────────────────────────────────
  { code: "S93.4", description: "Sprain and strain of ankle", category: "Injuries", aliases: ["ankle sprain", "twisted ankle"] },
  { code: "S63.5", description: "Sprain and strain of wrist", category: "Injuries", aliases: ["wrist sprain"] },
  { code: "S83.6", description: "Sprain and strain of other and unspecified parts of knee", category: "Injuries", aliases: ["knee sprain", "knee ligament injury"] },
  { code: "S16", description: "Injury of muscle and tendon at neck level (incl. whiplash strain)", category: "Injuries", aliases: ["neck strain", "whiplash"] },
  { code: "T14.0", description: "Superficial injury of unspecified body region (abrasion/contusion)", category: "Injuries", aliases: ["abrasion", "bruise", "contusion", "chot"] },
  { code: "T14.1", description: "Open wound of unspecified body region", category: "Injuries", aliases: ["laceration", "cut", "cut injury", "clw"] },
  { code: "S01.9", description: "Open wound of head, part unspecified", category: "Injuries", aliases: ["scalp laceration", "head wound"] },
  { code: "S06.0", description: "Concussion", category: "Injuries", aliases: ["mild head injury", "concussion"] },
  { code: "S52.5", description: "Fracture of lower end of radius", category: "Injuries", aliases: ["colles fracture", "wrist fracture", "distal radius fracture"] },
  { code: "S62.6", description: "Fracture of other finger", category: "Injuries", aliases: ["finger fracture"] },
  { code: "S92.3", description: "Fracture of metatarsal bone", category: "Injuries", aliases: ["metatarsal fracture", "foot fracture"] },
  { code: "T14.2", description: "Fracture of unspecified body region", category: "Injuries", aliases: ["fracture suspected", "fracture"] },
  { code: "T30.0", description: "Burn of unspecified body region, unspecified degree", category: "Injuries", aliases: ["burn", "jalna", "scald"] },
  { code: "T63.4", description: "Toxic effect of venom of other arthropods (insect bite/sting)", category: "Injuries", aliases: ["insect bite", "bee sting", "scorpion sting"] },
  { code: "T63.0", description: "Toxic effect of snake venom", category: "Injuries", aliases: ["snake bite"] },
  { code: "W54", description: "Bitten or struck by dog", category: "Injuries", aliases: ["dog bite", "animal bite"] },
  { code: "T78.4", description: "Allergy, unspecified (allergic reaction)", category: "Injuries", aliases: ["allergic reaction", "allergy"] },
  { code: "T78.3", description: "Angioneurotic oedema", category: "Injuries", aliases: ["angioedema", "lip swelling allergy"] },
  { code: "T15.9", description: "Foreign body on external eye, part unspecified", category: "Injuries", aliases: ["foreign body eye"] },
  { code: "T17.9", description: "Foreign body in respiratory tract, part unspecified", category: "Injuries", aliases: ["foreign body airway"] },

  // ── Skin ────────────────────────────────────────────────────────────
  { code: "L20.9", description: "Atopic dermatitis, unspecified (eczema)", category: "Skin", aliases: ["eczema", "atopic eczema"] },
  { code: "L23.9", description: "Allergic contact dermatitis, unspecified cause", category: "Skin", aliases: ["contact dermatitis"] },
  { code: "L30.9", description: "Dermatitis, unspecified", category: "Skin", aliases: ["dermatitis", "skin allergy"] },
  { code: "L50.9", description: "Urticaria, unspecified", category: "Skin", aliases: ["hives", "urticaria", "pitti"] },
  { code: "L70.0", description: "Acne vulgaris", category: "Skin", aliases: ["acne", "pimples", "muhase"] },
  { code: "L02.9", description: "Cutaneous abscess, furuncle and carbuncle, unspecified", category: "Skin", aliases: ["boil", "abscess skin", "furuncle", "phoda"] },
  { code: "L03.9", description: "Cellulitis, unspecified", category: "Skin", aliases: ["cellulitis"] },
  { code: "L01.0", description: "Impetigo", category: "Skin", aliases: ["impetigo"] },
  { code: "L40.9", description: "Psoriasis, unspecified", category: "Skin", aliases: ["psoriasis"] },
  { code: "L63.9", description: "Alopecia areata, unspecified", category: "Skin", aliases: ["alopecia", "hair loss patch"] },
  { code: "L21.9", description: "Seborrhoeic dermatitis, unspecified", category: "Skin", aliases: ["dandruff severe", "seborrheic dermatitis"] },
  { code: "L60.0", description: "Ingrowing nail", category: "Skin", aliases: ["ingrown toenail"] },
  { code: "B07", description: "Viral warts", category: "Skin", aliases: ["warts", "verruca"] },
  { code: "L29.9", description: "Pruritus, unspecified", category: "Skin", aliases: ["itching", "khujli generalised"] },
  { code: "L81.1", description: "Chloasma (melasma)", category: "Skin", aliases: ["melasma", "pigmentation face"] },

  // ── Genitourinary ───────────────────────────────────────────────────
  { code: "N39.0", description: "Urinary tract infection, site not specified", category: "Genitourinary", aliases: ["uti", "urine infection", "burning urination"] },
  { code: "N30.0", description: "Acute cystitis", category: "Genitourinary", aliases: ["cystitis"] },
  { code: "N10", description: "Acute tubulo-interstitial nephritis (acute pyelonephritis)", category: "Genitourinary", aliases: ["pyelonephritis", "kidney infection"] },
  { code: "N20.0", description: "Calculus of kidney", category: "Genitourinary", aliases: ["kidney stone", "renal calculus", "pathri"] },
  { code: "N20.1", description: "Calculus of ureter", category: "Genitourinary", aliases: ["ureteric stone", "ureteric calculus"] },
  { code: "N23", description: "Unspecified renal colic", category: "Genitourinary", aliases: ["renal colic", "stone pain"] },
  { code: "N18.9", description: "Chronic kidney disease, unspecified", category: "Genitourinary", aliases: ["ckd", "chronic renal failure"] },
  { code: "N40", description: "Benign prostatic hyperplasia", category: "Genitourinary", aliases: ["bph", "prostate enlargement"] },
  { code: "N45.9", description: "Orchitis, epididymitis and epididymo-orchitis without abscess", category: "Genitourinary", aliases: ["epididymo-orchitis", "testicular pain infection"] },
  { code: "N76.0", description: "Acute vaginitis", category: "Genitourinary", aliases: ["vaginitis", "white discharge infection"] },
  { code: "N91.2", description: "Amenorrhoea, unspecified", category: "Genitourinary", aliases: ["missed periods", "amenorrhea"] },
  { code: "N92.0", description: "Excessive and frequent menstruation with regular cycle (menorrhagia)", category: "Genitourinary", aliases: ["heavy periods", "menorrhagia"] },
  { code: "N94.6", description: "Dysmenorrhoea, unspecified", category: "Genitourinary", aliases: ["painful periods", "period pain", "dysmenorrhea"] },
  { code: "N94.3", description: "Premenstrual tension syndrome", category: "Genitourinary", aliases: ["pms"] },
  { code: "N95.1", description: "Menopausal and female climacteric states", category: "Genitourinary", aliases: ["menopause symptoms", "hot flashes"] },
  { code: "R31", description: "Unspecified haematuria", category: "Genitourinary", aliases: ["blood in urine", "hematuria"] },
  { code: "R35", description: "Polyuria", category: "Genitourinary", aliases: ["frequent urination"] },

  // ── Neurology ───────────────────────────────────────────────────────
  { code: "G43.9", description: "Migraine, unspecified", category: "Neurology", aliases: ["migraine", "adhkapari"] },
  { code: "G44.2", description: "Tension-type headache", category: "Neurology", aliases: ["tension headache"] },
  { code: "G40.9", description: "Epilepsy, unspecified", category: "Neurology", aliases: ["epilepsy", "mirgi", "seizure disorder"] },
  { code: "G51.0", description: "Bell's palsy (facial palsy)", category: "Neurology", aliases: ["bells palsy", "facial paralysis"] },
  { code: "G62.9", description: "Polyneuropathy, unspecified", category: "Neurology", aliases: ["peripheral neuropathy", "neuropathy"] },
  { code: "G47.0", description: "Disorders of initiating and maintaining sleep (insomnia)", category: "Neurology", aliases: ["insomnia", "neend nahi aana", "sleeplessness"] },
  { code: "G20", description: "Parkinson disease", category: "Neurology", aliases: ["parkinson's", "parkinsonism"] },
  { code: "H81.0", description: "Ménière disease", category: "Neurology", aliases: ["meniere's", "meniere"] },
  { code: "G54.4", description: "Lumbosacral root disorders, not elsewhere classified", category: "Neurology", aliases: ["lumbar radiculopathy", "nerve root compression"] },

  // ── Mental health ───────────────────────────────────────────────────
  { code: "F41.9", description: "Anxiety disorder, unspecified", category: "Mental health", aliases: ["anxiety", "ghabrahat"] },
  { code: "F41.0", description: "Panic disorder (episodic paroxysmal anxiety)", category: "Mental health", aliases: ["panic attack", "panic disorder"] },
  { code: "F32.9", description: "Depressive episode, unspecified", category: "Mental health", aliases: ["depression", "low mood"] },
  { code: "F43.2", description: "Adjustment disorders", category: "Mental health", aliases: ["stress reaction", "adjustment disorder"] },
  { code: "F45.9", description: "Somatoform disorder, unspecified", category: "Mental health", aliases: ["somatization", "psychosomatic"] },
  { code: "F10.2", description: "Mental and behavioural disorders due to use of alcohol: dependence syndrome", category: "Mental health", aliases: ["alcohol dependence", "alcoholism"] },
  { code: "F17.2", description: "Mental and behavioural disorders due to use of tobacco: dependence syndrome", category: "Mental health", aliases: ["tobacco dependence", "smoking addiction", "gutka addiction"] },
  { code: "F51.0", description: "Nonorganic insomnia", category: "Mental health", aliases: ["stress insomnia"] },

  // ── Eye ─────────────────────────────────────────────────────────────
  { code: "H10.9", description: "Conjunctivitis, unspecified", category: "Eye", aliases: ["conjunctivitis", "red eye", "aankh aana", "eye flu"] },
  { code: "H00.0", description: "Hordeolum and other deep inflammation of eyelid (stye)", category: "Eye", aliases: ["stye", "guheri"] },
  { code: "H04.9", description: "Disorder of lacrimal system, unspecified (watering eye)", category: "Eye", aliases: ["watering eyes", "epiphora"] },
  { code: "H25.9", description: "Senile cataract, unspecified", category: "Eye", aliases: ["cataract", "motiabind"] },
  { code: "H52.4", description: "Presbyopia", category: "Eye", aliases: ["reading glasses need", "presbyopia"] },
  { code: "H52.1", description: "Myopia", category: "Eye", aliases: ["short sight", "myopia"] },
  { code: "H57.1", description: "Ocular pain", category: "Eye", aliases: ["eye pain"] },
  { code: "H53.1", description: "Subjective visual disturbances", category: "Eye", aliases: ["blurred vision"] },

  // ── Blood ───────────────────────────────────────────────────────────
  { code: "D50.9", description: "Iron deficiency anaemia, unspecified", category: "Blood", aliases: ["iron deficiency", "ida", "anemia", "anaemia", "khoon ki kami"] },
  { code: "D51.9", description: "Vitamin B12 deficiency anaemia, unspecified", category: "Blood", aliases: ["b12 anemia", "megaloblastic anemia"] },
  { code: "D64.9", description: "Anaemia, unspecified", category: "Blood", aliases: ["anemia unspecified", "low hb", "low hemoglobin"] },
  { code: "D69.6", description: "Thrombocytopenia, unspecified", category: "Blood", aliases: ["low platelets", "thrombocytopenia"] },
  { code: "R59.9", description: "Enlarged lymph nodes, unspecified", category: "Blood", aliases: ["lymphadenopathy", "swollen glands"] },

  // ── Pregnancy & newborn ─────────────────────────────────────────────
  { code: "Z34", description: "Supervision of normal pregnancy", category: "Pregnancy & newborn", aliases: ["anc", "antenatal checkup", "pregnancy checkup"] },
  { code: "Z32.1", description: "Pregnancy confirmed", category: "Pregnancy & newborn", aliases: ["pregnancy positive", "upt positive"] },
  { code: "O21.0", description: "Mild hyperemesis gravidarum", category: "Pregnancy & newborn", aliases: ["morning sickness", "vomiting pregnancy"] },
  { code: "O99.0", description: "Anaemia complicating pregnancy, childbirth and the puerperium", category: "Pregnancy & newborn", aliases: ["anemia in pregnancy"] },
  { code: "O13", description: "Gestational (pregnancy-induced) hypertension", category: "Pregnancy & newborn", aliases: ["pih", "gestational hypertension"] },
  { code: "O24.4", description: "Diabetes mellitus arising in pregnancy (gestational diabetes)", category: "Pregnancy & newborn", aliases: ["gdm", "gestational diabetes"] },
  { code: "Z39.1", description: "Care and examination of lactating mother", category: "Pregnancy & newborn", aliases: ["lactation problem", "breastfeeding advice"] },
  { code: "P59.9", description: "Neonatal jaundice, unspecified", category: "Pregnancy & newborn", aliases: ["neonatal jaundice", "newborn jaundice"] },

  // ── Paediatrics ─────────────────────────────────────────────────────
  { code: "R62.8", description: "Other lack of expected normal physiological development (failure to thrive)", category: "Paediatrics", aliases: ["failure to thrive", "poor weight gain"] },
  { code: "E45", description: "Retarded development following protein-energy malnutrition", category: "Paediatrics", aliases: ["malnutrition child", "pem"] },
  { code: "K00.7", description: "Teething syndrome", category: "Paediatrics", aliases: ["teething"] },
  { code: "R68.1", description: "Nonspecific symptoms peculiar to infancy (excessive crying)", category: "Paediatrics", aliases: ["excessive crying", "colic baby"] },
  { code: "B08.4", description: "Enteroviral vesicular stomatitis with exanthem (hand, foot and mouth)", category: "Paediatrics", aliases: ["hfmd", "hand foot mouth"] },
  { code: "J05.0", description: "Acute obstructive laryngitis (croup)", category: "Paediatrics", aliases: ["croup", "barking cough"] },
  { code: "L22", description: "Diaper (napkin) dermatitis", category: "Paediatrics", aliases: ["nappy rash", "diaper rash"] },
  { code: "F90.9", description: "Hyperkinetic disorder, unspecified (ADHD)", category: "Paediatrics", aliases: ["adhd", "hyperactive child"] },

  // ── Encounters & administrative (Z-codes) ───────────────────────────
  { code: "Z00.0", description: "General medical examination", category: "Encounters", aliases: ["general checkup", "routine checkup", "health checkup", "full body checkup"] },
  { code: "Z00.1", description: "Routine child health examination", category: "Encounters", aliases: ["child checkup", "well baby visit"] },
  { code: "Z23", description: "Need for immunization against single bacterial disease (vaccination)", category: "Encounters", aliases: ["vaccination", "immunization", "teeka"] },
  { code: "Z02.7", description: "Issue of medical certificate", category: "Encounters", aliases: ["fitness certificate", "medical certificate", "sick note"] },
  { code: "Z09.8", description: "Follow-up examination after other treatment for other conditions", category: "Encounters", aliases: ["follow up", "review visit"] },
  { code: "Z71.3", description: "Dietary counselling and surveillance", category: "Encounters", aliases: ["diet counselling", "diet advice"] },
  { code: "Z30.0", description: "General counselling and advice on contraception", category: "Encounters", aliases: ["family planning", "contraception advice"] },
  { code: "Z76.0", description: "Issue of repeat prescription", category: "Encounters", aliases: ["repeat prescription", "medicine refill"] },
];

/**
 * Search the curated list by code prefix or by substring of the
 * description/aliases. Case-insensitive. Code-prefix matches rank first.
 */
export function searchIcd10(query: string, limit = 8): Icd10Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const codeMatches: Icd10Entry[] = [];
  const textMatches: Icd10Entry[] = [];
  for (const entry of ICD10_CODES) {
    if (entry.code.toLowerCase().startsWith(q)) {
      codeMatches.push(entry);
    } else if (
      entry.description.toLowerCase().includes(q) ||
      entry.aliases.some((a) => a.includes(q))
    ) {
      textMatches.push(entry);
    }
    if (codeMatches.length >= limit) break;
  }
  return [...codeMatches, ...textMatches].slice(0, limit);
}

export function findIcd10ByCode(code: string): Icd10Entry | undefined {
  const c = code.trim().toUpperCase();
  return ICD10_CODES.find((e) => e.code === c);
}
