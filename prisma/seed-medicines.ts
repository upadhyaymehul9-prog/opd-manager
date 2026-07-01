import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MEDICINES: { name: string; form?: string; strength?: string }[] = [
  { name: "Paracetamol", form: "tablet", strength: "500mg" },
  { name: "Paracetamol", form: "syrup", strength: "125mg/5ml" },
  { name: "Ibuprofen", form: "tablet", strength: "400mg" },
  { name: "Amoxicillin", form: "capsule", strength: "500mg" },
  { name: "Azithromycin", form: "tablet", strength: "500mg" },
  { name: "Cetirizine", form: "tablet", strength: "10mg" },
  { name: "Levocetirizine", form: "tablet", strength: "5mg" },
  { name: "Pantoprazole", form: "tablet", strength: "40mg" },
  { name: "Omeprazole", form: "capsule", strength: "20mg" },
  { name: "Domperidone", form: "tablet", strength: "10mg" },
  { name: "Ondansetron", form: "tablet", strength: "4mg" },
  { name: "Metformin", form: "tablet", strength: "500mg" },
  { name: "Glimepiride", form: "tablet", strength: "2mg" },
  { name: "Amlodipine", form: "tablet", strength: "5mg" },
  { name: "Telmisartan", form: "tablet", strength: "40mg" },
  { name: "Atorvastatin", form: "tablet", strength: "10mg" },
  { name: "Losartan", form: "tablet", strength: "50mg" },
  { name: "Salbutamol", form: "inhaler", strength: "100mcg" },
  { name: "Montelukast", form: "tablet", strength: "10mg" },
  { name: "Dicyclomine", form: "tablet", strength: "10mg" },
  { name: "ORS", form: "powder", strength: "sachet" },
  { name: "Zinc Sulphate", form: "tablet", strength: "20mg" },
  { name: "Iron Folic Acid", form: "tablet" },
  { name: "Calcium Carbonate", form: "tablet", strength: "500mg" },
  { name: "Vitamin D3", form: "capsule", strength: "60k IU" },
  { name: "Diclofenac", form: "tablet", strength: "50mg" },
  { name: "Tramadol", form: "capsule", strength: "50mg" },
  { name: "Ciprofloxacin", form: "tablet", strength: "500mg" },
  { name: "Metronidazole", form: "tablet", strength: "400mg" },
  { name: "Clotrimazole", form: "cream", strength: "1%" },
  { name: "Betamethasone", form: "cream" },
  { name: "Artificial Tears", form: "drops" },
];

async function main() {
  let created = 0;
  for (const med of MEDICINES) {
    const existing = await prisma.medicine.findFirst({
      where: {
        name: { equals: med.name, mode: "insensitive" },
        form: med.form ?? null,
        strength: med.strength ?? null,
      },
    });
    if (existing) continue;

    await prisma.medicine.create({
      data: {
        name: med.name,
        form: med.form ?? null,
        strength: med.strength ?? null,
      },
    });
    created += 1;
  }

  console.log(`Seeded ${created} new medicine(s). Catalog ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
