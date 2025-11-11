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
        name: "Mercado",
        type: "expense",
        color: "#FF8A80",
        icon: "basket-shopping",
      },
      {
        name: "Restaurante",
        type: "expense",
        color: "#FF8A80",
        icon: "utensils",
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
    ],
  },
  {
    name: "Renda",
    type: "income",
    color: "#A5D6A7",
    icon: "wallet",
    children: [
      {
        name: "Salário",
        type: "income",
        color: "#A5D6A7",
        icon: "wallet",
      },
      {
        name: "Freelance",
        type: "income",
        color: "#A5D6A7",
        icon: "briefcase",
      },
    ],
  },
];


