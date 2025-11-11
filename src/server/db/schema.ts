import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ==== ENUMS ====
export const currencyType = pgEnum("currency_type", ["BRL", "USD"]);
export const transactionType = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer",
]);

export const accountType = pgEnum("account_type_v2", [
  "checking",
  "credit",
  "investment",
]);

export const paymentMethod = pgEnum("payment_method", [
  "debit",
  "credit",
  "pix",
  "transfer",
  "cash",
  "boleto",
  "investment",
]);

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);

export const categoryType = pgEnum("category_type", ["expense", "income"]);

export const recurrenceType = pgEnum("recurrence_type", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

// ==== USERS ====

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerk_id: varchar("clerk_id", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull(),
  onboarding_completed: boolean("onboarding_completed")
    .default(false)
    .notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== FINANCIAL GROUPS ====

export const financial_groups = pgTable("financial_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  owner_id: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== MEMBERS ====

export const financial_group_members = pgTable("financial_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  role: memberRole("role").default("viewer").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== BANK ACCOUNTS ====

export const bank_accounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  name: varchar("name", { length: 191 }).notNull(),
  type: accountType("type").default("checking").notNull(),
  initial_balance: numeric("initial_balance", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  currency: currencyType("currency").default("BRL").notNull(),
  color: varchar("color", { length: 32 }).default("#000000").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== CATEGORIES (hierarquia + soft delete) ====

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  parent_id: uuid("parent_id").$type<string | null>(),
  name: varchar("name", { length: 191 }).notNull(),
  type: categoryType("type").notNull(),
  color: varchar("color", { length: 32 }).default("#cccccc").notNull(),
  icon: varchar("icon", { length: 191 }).default("").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ==== RECURRING TRANSACTIONS (fixas) ====

export const recurring_transactions = pgTable("recurring_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),

  type: transactionType("type").notNull(), // expense, income ou transfer
  method: paymentMethod("method").notNull(),
  description: text("description").$type<string | null>(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: currencyType("currency").default("BRL").notNull(),

  account_id: uuid("account_id")
    .notNull()
    .references(() => bank_accounts.id),
  from_account_id: uuid("from_account_id").$type<string | null>(),
  to_account_id: uuid("to_account_id").$type<string | null>(),
  category_id: uuid("category_id").$type<string | null>(),

  recurrence_type: recurrenceType("recurrence_type").notNull(),
  start_date: timestamp("start_date", { mode: "date" }).notNull(),
  end_date: timestamp("end_date", { mode: "date" }).$type<Date | null>(),
  is_active: boolean("is_active").default(true).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== TRANSACTIONS (únicas, parceladas ou fixas) ====

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),

  // === Relacionamentos ===
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),

  account_id: uuid("account_id")
    .notNull()
    .references(() => bank_accounts.id),

  category_id: uuid("category_id").$type<string | null>(),
  category_name_snapshot: varchar("category_name_snapshot", {
    length: 191,
  }).$type<string | null>(),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),

  // === Tipo e método ===
  type: transactionType("type").notNull(),
  method: paymentMethod("method").notNull(),

  // === Transferências (quando for o caso) ===
  from_account_id: uuid("from_account_id").$type<string | null>(),
  to_account_id: uuid("to_account_id").$type<string | null>(),
  transfer_id: uuid("transfer_id").$type<string | null>(),

  // === Dados financeiros ===
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: currencyType("currency").default("BRL").notNull(),
  description: text("description").$type<string | null>(),

  // === Datas principais ===
  date: timestamp("date").notNull(), // Data prevista
  is_paid: boolean("is_paid").default(false).notNull(), // Indica se foi pago
  paid_at: timestamp("paid_at", { mode: "date" }).$type<Date | null>(), // Data real do pagamento

  // === Anexos ===
  attachment_url: varchar("attachment_url", { length: 512 }).$type<
    string | null
  >(),

  // === Relação com recorrência e parcelas ===
  recurring_id: uuid("recurring_id")
    .references(() => recurring_transactions.id)
    .$type<string | null>(),

  installment_group_id: uuid("installment_group_id").$type<string | null>(),
  installment_number: integer("installment_number").$type<number | null>(),
  total_installments: integer("total_installments").$type<number | null>(),

  // === Metadados ===
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== PROVISIONS ====

export const provisions = pgTable("provisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  category_id: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  planned_amount: numeric("planned_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
