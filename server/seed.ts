import { db } from "./db";
import { classrooms, children } from "@shared/schema";
import { addMonths, format } from "date-fns";

const CLASSROOMS_DATA = [
  { name: "Infants", color: "bg-blue-100 text-blue-700 border-blue-200", minAgeMonths: 0, maxAgeMonths: 12, capacity: 8, ratio: "1:4" },
  { name: "Wobblers", color: "bg-green-100 text-green-700 border-green-200", minAgeMonths: 12, maxAgeMonths: 24, capacity: 10, ratio: "1:5" },
  { name: "Toddlers", color: "bg-yellow-100 text-yellow-700 border-yellow-200", minAgeMonths: 24, maxAgeMonths: 36, capacity: 14, ratio: "1:7" },
  { name: "Preschool", color: "bg-orange-100 text-orange-700 border-orange-200", minAgeMonths: 36, maxAgeMonths: 48, capacity: 20, ratio: "1:10" },
  { name: "Pre-K", color: "bg-pink-100 text-pink-700 border-pink-200", minAgeMonths: 48, maxAgeMonths: 60, capacity: 24, ratio: "1:12" },
];

function generateChildren() {
  const today = new Date();
  const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Isabella", "Elijah", "Sophia", "Lucas", "Mia", "Mason", "Amelia", "Logan", "Harper"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

  const result = [];
  const rng = (max: number) => Math.floor(Math.random() * max);

  for (let i = 0; i < 55; i++) {
    const ageInMonths = rng(58) + 1;
    const birthDate = addMonths(today, -ageInMonths);
    result.push({
      name: `${firstNames[rng(firstNames.length)]} ${lastNames[rng(lastNames.length)].charAt(0)}.`,
      birthDate: format(birthDate, "yyyy-MM-dd"),
      enrollmentDate: format(addMonths(birthDate, rng(6) + 3), "yyyy-MM-dd"),
    });
  }
  return result;
}

async function seed() {
  const existingClassrooms = await db.select().from(classrooms);
  if (existingClassrooms.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("Seeding classrooms...");
  await db.insert(classrooms).values(CLASSROOMS_DATA);

  console.log("Seeding children...");
  await db.insert(children).values(generateChildren());

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
