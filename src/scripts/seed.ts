import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/server/db/client";
import { category_presets } from "@/server/db/schema";

// Presets organizados
const defaultPresets = [
  {
    name: "Alimentação",
    icon: "utensils",
    color: "#FF8A80",
    type: "expense",
    children: [
      { name: "Mercado/Supermercado", icon: "basket-shopping" },
      { name: "Restaurantes e Bares", icon: "mug-hot" },
      { name: "Lanches/Fast Food", icon: "burger" },
      { name: "Delivery", icon: "motorcycle" },
      { name: "Açougue/Pescados", icon: "drumstick-bite" },
      { name: "Hortifruti", icon: "carrot" },
      { name: "Padaria", icon: "bread-slice" },
    ],
  },
  {
    name: "Moradia",
    icon: "house",
    color: "#FFD700",
    type: "expense",
    children: [
      { name: "Aluguel/Hipoteca", icon: "file-invoice-dollar" },
      { name: "Condomínio/Taxas", icon: "building" },
      { name: "Água", icon: "droplet" },
      { name: "Luz", icon: "lightbulb" },
      { name: "Gás", icon: "fire-flame-simple" },
      { name: "Internet", icon: "wifi" },
      { name: "TV/Streaming", icon: "tv" },
      { name: "Reparos/Manutenção", icon: "screwdriver-wrench" },
      { name: "Móveis", icon: "couch" },
      { name: "Eletrodomésticos", icon: "blender" },
    ],
  },
  {
    name: "Transporte",
    icon: "car",
    color: "#82B1FF",
    type: "expense",
    children: [
      { name: "Combustível", icon: "gas-pump" },
      { name: "Aplicativos", icon: "taxi" },
      { name: "Transporte Público", icon: "bus" },
      { name: "Passagens", icon: "plane" },
      { name: "Manutenção Veículo", icon: "car-on" },
      { name: "Estacionamento", icon: "square-parking" },
      { name: "Seguro do Carro", icon: "shield-car" },
      { name: "IPVA", icon: "id-card" },
    ],
  },
  {
    name: "Saúde",
    icon: "heart-pulse",
    color: "#4CAF50",
    type: "expense",
    children: [
      { name: "Plano de Saúde", icon: "briefcase-medical" },
      { name: "Consultas Médicas", icon: "user-doctor" },
      { name: "Farmácia", icon: "pills" },
      { name: "Exames", icon: "microscope" },
      { name: "Terapias", icon: "brain" },
      { name: "Emergências", icon: "hospital" },
    ],
  },
  {
    name: "Receitas",
    icon: "money-bill-wave",
    color: "#4CAF50",
    type: "income",
    children: [
      { name: "Salário/Pró-Labore", icon: "wallet" },
      { name: "Renda Extra/Freelas", icon: "briefcase" },
      { name: "Investimentos", icon: "chart-line" },
      { name: "Venda de Bens", icon: "handshake" },
      { name: "Cashback", icon: "rotate-left" },
      { name: "Reembolsos", icon: "arrow-left" },
      { name: "Doações Recebidas", icon: "gift" },
      { name: "Outras Receitas", icon: "ellipsis" },
    ],
  },
];

async function main() {
  for (const parent of defaultPresets) {
    const parentId = uuidv4();

    await db.insert(category_presets).values({
      id: parentId,
      parent_id: null,
      name: parent.name,
      icon: parent.icon,
      color: parent.color,
      type: parent.type as "expense" | "income",
    });

    if (parent.children?.length) {
      const children = parent.children.map((child) => ({
        id: uuidv4(),
        parent_id: parentId,
        name: child.name,
        icon: child.icon,
        color: parent.color,
        type: parent.type,
      }));

      await db
        .insert(category_presets)
        .values(children as (typeof category_presets.$inferInsert)[]);
    }
  }

  console.log("✅ Presets de categorias inseridos com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
