import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/server/db/client";
import {
  categories,
  financial_group_members,
  financial_groups,
  users,
} from "@/server/db/schema";

async function main() {
  // 1️⃣ Cria um usuário fake (caso queira simular um Clerk user)
  const userId = uuidv4();
  const userEmail = "teste@naency.app";
  await db.insert(users).values({
    id: userId,
    clerk_id: "fake_clerk_id",
    name: "Usuário Teste",
    email: userEmail,
  });

  // 2️⃣ Cria um grupo financeiro associado a esse usuário
  const groupId = uuidv4();
  await db.insert(financial_groups).values({
    id: groupId,
    name: "Financeiro Pessoal",
    owner_id: userId,
  });

  // 3️⃣ Adiciona o usuário como membro do grupo
  await db.insert(financial_group_members).values({
    id: uuidv4(),
    group_id: groupId,
    user_id: userId,
    role: "owner",
  });

  // 4️⃣ Cria categorias padrão vinculadas a esse grupo
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
      group_id: groupId,
      parent_id: transportId,
      name: "Aplicativos",
      type: "expense",
      color: "#82B1FF",
      icon: "taxi",
    },
  ]);

  console.log("✅ Seed finalizado!");
  console.log(`User ID: ${userId}`);
  console.log(`Group ID: ${groupId}`);
  console.log("Categorias padrão inseridas com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
