export type CategoryTemplate = {
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
  children?: CategoryTemplate[];
};

export const DEFAULT_CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    name: "Alimentação",
    type: "expense",
    color: "#FF8A80",
    icon: "utensils",
    children: [
      {
        name: "Mercado/Supermercado",
        type: "expense",
        color: "#FF8A80",
        icon: "basket-shopping",
      },
      {
        name: "Restaurantes e Bares",
        type: "expense",
        color: "#FF8A80",
        icon: "mug-hot",
      },
      {
        name: "Lanches/Fast Food",
        type: "expense",
        color: "#FF8A80",
        icon: "burger",
      },
      {
        name: "Delivery",
        type: "expense",
        color: "#FF8A80",
        icon: "motorcycle",
      },
      {
        name: "Açougue/Pescados",
        type: "expense",
        color: "#FF8A80",
        icon: "drumstick-bite",
      },
      {
        name: "Hortifruti",
        type: "expense",
        color: "#FF8A80",
        icon: "carrot",
      },
      {
        name: "Padaria",
        type: "expense",
        color: "#FF8A80",
        icon: "bread-slice",
      },
    ],
  },
  {
    name: "Moradia",
    type: "expense",
    color: "#FFD700",
    icon: "house",
    children: [
      {
        name: "Aluguel/Hipoteca",
        type: "expense",
        color: "#FFD700",
        icon: "file-invoice-dollar",
      },
      {
        name: "Condomínio/Taxas",
        type: "expense",
        color: "#FFD700",
        icon: "building",
      },
      {
        name: "Água",
        type: "expense",
        color: "#FFD700",
        icon: "droplet",
      },
      {
        name: "Luz",
        type: "expense",
        color: "#FFD700",
        icon: "lightbulb",
      },
      {
        name: "Gás",
        type: "expense",
        color: "#FFD700",
        icon: "fire-flame-simple",
      },
      {
        name: "Internet",
        type: "expense",
        color: "#FFD700",
        icon: "wifi",
      },
      {
        name: "TV/Streaming",
        type: "expense",
        color: "#FFD700",
        icon: "tv",
      },
      {
        name: "Reparos/Manutenção",
        type: "expense",
        color: "#FFD700",
        icon: "screwdriver-wrench",
      },
      {
        name: "Móveis",
        type: "expense",
        color: "#FFD700",
        icon: "couch",
      },
      {
        name: "Eletrodomésticos",
        type: "expense",
        color: "#FFD700",
        icon: "blender",
      },
    ],
  },
  {
    name: "Transporte",
    type: "expense",
    color: "#82B1FF",
    icon: "car",
    children: [
      {
        name: "Combustível",
        type: "expense",
        color: "#82B1FF",
        icon: "gas-pump",
      },
      {
        name: "Aplicativos",
        type: "expense",
        color: "#82B1FF",
        icon: "taxi",
      },
      {
        name: "Transporte Público",
        type: "expense",
        color: "#82B1FF",
        icon: "bus",
      },
      {
        name: "Passagens",
        type: "expense",
        color: "#82B1FF",
        icon: "plane",
      },
      {
        name: "Manutenção Veículo",
        type: "expense",
        color: "#82B1FF",
        icon: "car-on",
      },
      {
        name: "Estacionamento",
        type: "expense",
        color: "#82B1FF",
        icon: "square-parking",
      },
      {
        name: "Seguro do Carro",
        type: "expense",
        color: "#82B1FF",
        icon: "shield-car",
      },
      {
        name: "IPVA",
        type: "expense",
        color: "#82B1FF",
        icon: "id-card",
      },
    ],
  },
  {
    name: "Saúde",
    type: "expense",
    color: "#4CAF50",
    icon: "heart-pulse",
    children: [
      {
        name: "Plano de Saúde",
        type: "expense",
        color: "#4CAF50",
        icon: "briefcase-medical",
      },
      {
        name: "Consultas Médicas",
        type: "expense",
        color: "#4CAF50",
        icon: "user-doctor",
      },
      {
        name: "Farmácia",
        type: "expense",
        color: "#4CAF50",
        icon: "pills",
      },
      {
        name: "Exames",
        type: "expense",
        color: "#4CAF50",
        icon: "microscope",
      },
      {
        name: "Terapias",
        type: "expense",
        color: "#4CAF50",
        icon: "brain",
      },
      {
        name: "Emergências",
        type: "expense",
        color: "#4CAF50",
        icon: "hospital",
      },
    ],
  },
  {
    name: "Receitas",
    type: "income",
    color: "#4CAF50",
    icon: "money-bill-wave",
    children: [
      {
        name: "Salário/Pró-Labore",
        type: "income",
        color: "#4CAF50",
        icon: "wallet",
      },
      {
        name: "Renda Extra/Freelas",
        type: "income",
        color: "#4CAF50",
        icon: "briefcase",
      },
      {
        name: "Investimentos",
        type: "income",
        color: "#4CAF50",
        icon: "chart-line",
      },
      {
        name: "Venda de Bens",
        type: "income",
        color: "#4CAF50",
        icon: "handshake",
      },
      {
        name: "Cashback",
        type: "income",
        color: "#4CAF50",
        icon: "rotate-left",
      },
      {
        name: "Reembolsos",
        type: "income",
        color: "#4CAF50",
        icon: "arrow-left",
      },
      {
        name: "Doações Recebidas",
        type: "income",
        color: "#4CAF50",
        icon: "gift",
      },
      {
        name: "Outras Receitas",
        type: "income",
        color: "#4CAF50",
        icon: "ellipsis",
      },
    ],
  },
];
