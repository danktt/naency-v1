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
  // 4️⃣ Cria categorias padrão vinculadas a esse grupo

  // --- DESPESAS ---

  // Alimentação
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
      name: "Mercado/Supermercado",
      type: "expense",
      color: "#FF8A80",
      icon: "basket-shopping",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: foodId,
      name: "Restaurantes e Bares",
      type: "expense",
      color: "#FF8A80",
      icon: "mug-hot",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: foodId,
      name: "Lanches/Fast Food",
      type: "expense",
      color: "#FF8A80",
      icon: "burger",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: foodId,
      name: "Delivery",
      type: "expense",
      color: "#FF8A80",
      icon: "motorcycle",
    },
  ]);

  // Moradia
  const housingId = uuidv4();
  await db.insert(categories).values({
    id: housingId,
    group_id: groupId,
    parent_id: null,
    name: "Moradia",
    type: "expense",
    color: "#FFD700", // Amarelo Dourado
    icon: "house",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: housingId,
      name: "Aluguel/Hipoteca",
      type: "expense",
      color: "#FFD700",
      icon: "file-invoice-dollar",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: housingId,
      name: "Condomínio/Taxas",
      type: "expense",
      color: "#FFD700",
      icon: "building",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: housingId,
      name: "Água, Luz e Gás",
      type: "expense",
      color: "#FFD700",
      icon: "lightbulb",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: housingId,
      name: "Internet e TV",
      type: "expense",
      color: "#FFD700",
      icon: "wifi",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: housingId,
      name: "Reparos e Manutenção",
      type: "expense",
      color: "#FFD700",
      icon: "screwdriver-wrench",
    },
  ]);

  // Transporte
  const transportId = uuidv4();
  await db.insert(categories).values({
    id: transportId,
    group_id: groupId,
    parent_id: null,
    name: "Transporte",
    type: "expense",
    color: "#82B1FF", // Azul Claro
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
      name: "Aplicativos (Uber/99)",
      type: "expense",
      color: "#82B1FF",
      icon: "taxi",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: transportId,
      name: "Passagens Aéreas/Rodoviárias",
      type: "expense",
      color: "#82B1FF",
      icon: "plane",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: transportId,
      name: "Manutenção de Veículo",
      type: "expense",
      color: "#82B1FF",
      icon: "car-on",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: transportId,
      name: "Estacionamento e Pedágios",
      type: "expense",
      color: "#82B1FF",
      icon: "square-parking",
    },
  ]);

  // Saúde
  const healthId = uuidv4();
  await db.insert(categories).values({
    id: healthId,
    group_id: groupId,
    parent_id: null,
    name: "Saúde",
    type: "expense",
    color: "#4CAF50", // Verde
    icon: "heart-pulse",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: healthId,
      name: "Plano de Saúde",
      type: "expense",
      color: "#4CAF50",
      icon: "briefcase-medical",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: healthId,
      name: "Consultas Médicas/Odonto",
      type: "expense",
      color: "#4CAF50",
      icon: "user-doctor",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: healthId,
      name: "Medicamentos/Farmácia",
      type: "expense",
      color: "#4CAF50",
      icon: "pills",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: healthId,
      name: "Exames e Terapias",
      type: "expense",
      color: "#4CAF50",
      icon: "microscope",
    },
  ]);

  // Educação
  const educationId = uuidv4();
  await db.insert(categories).values({
    id: educationId,
    group_id: groupId,
    parent_id: null,
    name: "Educação",
    type: "expense",
    color: "#9C27B0", // Roxo
    icon: "graduation-cap",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: educationId,
      name: "Mensalidades (Escola/Faculdade)",
      type: "expense",
      color: "#9C27B0",
      icon: "book",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: educationId,
      name: "Cursos e Treinamentos",
      type: "expense",
      color: "#9C27B0",
      icon: "laptop-code",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: educationId,
      name: "Material Escolar/Livros",
      type: "expense",
      color: "#9C27B0",
      icon: "pencil",
    },
  ]);

  // Lazer e Viagem
  const leisureId = uuidv4();
  await db.insert(categories).values({
    id: leisureId,
    group_id: groupId,
    parent_id: null,
    name: "Lazer e Viagens",
    type: "expense",
    color: "#FFEB3B", // Amarelo
    icon: "popcorn",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: leisureId,
      name: "Passeios e Eventos",
      type: "expense",
      color: "#FFEB3B",
      icon: "mask-face",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: leisureId,
      name: "Hospedagem e Turismo",
      type: "expense",
      color: "#FFEB3B",
      icon: "suitcase-rolling",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: leisureId,
      name: "Jogos e Assinaturas",
      type: "expense",
      color: "#FFEB3B",
      icon: "gamepad",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: leisureId,
      name: "Cinema e Teatro",
      type: "expense",
      color: "#FFEB3B",
      icon: "clapperboard",
    },
  ]);

  // Pessoais e Cuidados
  const personalId = uuidv4();
  await db.insert(categories).values({
    id: personalId,
    group_id: groupId,
    parent_id: null,
    name: "Cuidados Pessoais",
    type: "expense",
    color: "#E91E63", // Rosa
    icon: "shirt",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: personalId,
      name: "Vestuário e Calçados",
      type: "expense",
      color: "#E91E63",
      icon: "tags",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: personalId,
      name: "Salão de Beleza/Barbearia",
      type: "expense",
      color: "#E91E63",
      icon: "scissors",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: personalId,
      name: "Cosméticos e Higiene",
      type: "expense",
      color: "#E91E63",
      icon: "soap",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: personalId,
      name: "Presentes e Doações",
      type: "expense",
      color: "#E91E63",
      icon: "gift",
    },
  ]);

  // Serviços Financeiros
  const financialId = uuidv4();
  await db.insert(categories).values({
    id: financialId,
    group_id: groupId,
    parent_id: null,
    name: "Serviços Financeiros",
    type: "expense",
    color: "#607D8B", // Azul Ardósia
    icon: "piggy-bank",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: financialId,
      name: "Impostos e Taxas",
      type: "expense",
      color: "#607D8B",
      icon: "receipt",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: financialId,
      name: "Juros e Multas",
      type: "expense",
      color: "#607D8B",
      icon: "money-bill-transfer",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: financialId,
      name: "Tarifas Bancárias",
      type: "expense",
      color: "#607D8B",
      icon: "building-columns",
    },
  ]);

  // Outras Despesas
  const otherExpenseId = uuidv4();
  await db.insert(categories).values({
    id: otherExpenseId,
    group_id: groupId,
    parent_id: null,
    name: "Outras Despesas",
    type: "expense",
    color: "#BDBDBD", // Cinza
    icon: "ellipsis",
  });

  // --- RECEITAS ---

  // Receitas Principais
  const incomeId = uuidv4();
  await db.insert(categories).values({
    id: incomeId,
    group_id: groupId,
    parent_id: null,
    name: "Receitas",
    type: "income",
    color: "#4CAF50", // Mesmo verde da saúde, mas para Receita
    icon: "money-bill-wave",
  });

  await db.insert(categories).values([
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Salário/Pró-Labore",
      type: "income",
      color: "#4CAF50",
      icon: "wallet",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Renda Extra/Freelance",
      type: "income",
      color: "#4CAF50",
      icon: "briefcase",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Rendimento de Investimentos",
      type: "income",
      color: "#4CAF50",
      icon: "chart-line",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Presentes/Doações Recebidas",
      type: "income",
      color: "#4CAF50",
      icon: "gift",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Reembolsos",
      type: "income",
      color: "#4CAF50",
      icon: "rotate-left",
    },
    {
      id: uuidv4(),
      group_id: groupId,
      parent_id: incomeId,
      name: "Outras Receitas",
      type: "income",
      color: "#4CAF50",
      icon: "ellipsis",
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
