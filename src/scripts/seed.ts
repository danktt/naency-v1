import { v4 as uuidv4 } from "uuid";
import { categories } from "@/server/db/schema";
import { db } from "../server/db/client";

export async function seedCategories(groupId: string) {
  const foodId = uuidv4();
  await db.insert(categories).values({
    id: foodId,
    group_id: groupId,
    parent_id: null,
    name: "Alimentação",
    type: "expense",
    color: "#FF8A80",
    icon: "utensils",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: foodId,
      name: "Mercado",
      type: "expense",
      color: "#FF8A80",
      icon: "basket-shopping",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: foodId,
      name: "Restaurante",
      type: "expense",
      color: "#FF8A80",
      icon: "utensils",
    },
  ]);

  const transportId = uuidv4();
  await db.insert(categories).values({
    id: transportId,
    group_id: groupId,
    parent_id: null,
    name: "Transporte",
    type: "expense",
    color: "#82B1FF",
    icon: "car",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: transportId,
      name: "Combustível",
      type: "expense",
      color: "#82B1FF",
      icon: "gas-pump",
    },
    {
      id: uuidv4(),
      group_id: transportId,
      parent_id: transportId,
      name: "Aplicativos",
      type: "expense",
      color: "#82B1FF",
      icon: "taxi",
    },
  ]);
}

async function main() {
  const groupId = "0335156f-2147-448e-81b6-521272516680";
  await seedCategories(groupId);
  console.log("✅ Categorias padrão inseridas!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
