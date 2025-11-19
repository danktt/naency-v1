import {
  boolean,
  integer,
  jsonb,
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
  presets_imported: boolean("presets_imported").default(false).notNull(),
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

// ==== BANK ACCOUNTS (contas correntes, investimentos etc.) ====
export const bank_accounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),
  name: varchar("name", { length: 191 }).notNull(),
  type: accountType("type").default("checking").notNull(),
  // saldo inicial (ex: 0.00 ou valor atual)
  initial_balance: numeric("initial_balance", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  currency: currencyType("currency").default("BRL").notNull(),
  color: varchar("color", { length: 32 }).default("#000000").notNull(),
  // optional external institution reference (string id or name) - flexible
  external_institution_id: varchar("external_institution_id", {
    length: 191,
  }).$type<string | null>(),
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
// NOTE: For Model 2 (card-independent), credit transactions reference credit_cards
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),

  // === Relacionamentos ===
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id),

  // bank_account_id is used for debit transactions and bill payments
  account_id: uuid("account_id")
    .$type<string | null>()
    .references(() => bank_accounts.id),

  // category snapshot
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

  // === Cartões (Model 2) ===
  // credit_card_id is populated for transactions created as card purchases
  credit_card_id: uuid("credit_card_id").$type<string | null>(),
  credit_bill_item_id: uuid("credit_bill_item_id").$type<string | null>(),
  credit_bill_id: uuid("credit_bill_id").$type<string | null>(),

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

// ==== CREDIT CARDS (independentes) ====
export const credit_cards = pgTable("credit_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id, { onDelete: "cascade" }),
  // optional human name (ex: "Cartão XP")
  name: varchar("name", { length: 191 }).notNull(),
  // optional brand
  brand: varchar("brand", { length: 64 }).$type<string | null>(),
  // credit limits and metadata
  credit_limit: numeric("credit_limit", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  available_limit: numeric("available_limit", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  // optional linking to an institution or external id
  external_institution_id: varchar("external_institution_id", {
    length: 191,
  }).$type<string | null>(),
  // billing cycle
  closing_day: integer("closing_day").$type<number | null>(), // 1-31
  due_day: integer("due_day").$type<number | null>(), // 1-31
  currency: currencyType("currency").default("BRL").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== CREDIT CARD BILLS (faturas mensais) ====
export const credit_card_bills = pgTable("credit_card_bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  card_id: uuid("card_id")
    .notNull()
    .references(() => credit_cards.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  closing_date: timestamp("closing_date", {
    mode: "date",
  }).$type<Date | null>(),
  due_date: timestamp("due_date", { mode: "date" }).$type<Date | null>(),
  total_amount: numeric("total_amount", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  is_paid: boolean("is_paid").default(false).notNull(),
  paid_at: timestamp("paid_at", { mode: "date" }).$type<Date | null>(),
  // nullable: which account was used to pay (Model 2 allows any account)
  paid_with_account_id: uuid("paid_with_account_id")
    .$type<string | null>()
    .references(() => bank_accounts.id, { onDelete: "set null" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ==== CREDIT CARD BILL ITEMS (itens da fatura) ====
export const credit_card_bill_items = pgTable("credit_card_bill_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bill_id: uuid("bill_id")
    .notNull()
    .references(() => credit_card_bills.id, { onDelete: "cascade" }),
  transaction_id: uuid("transaction_id")
    .references(() => transactions.id, { onDelete: "set null" })
    .$type<string | null>(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description").$type<string | null>(),
  category_id: uuid("category_id").$type<string | null>(),
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
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  note: text("note"),
});

export const provision_templates = pgTable("provision_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const provision_template_items = pgTable("provision_template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  template_id: uuid("template_id")
    .notNull()
    .references(() => provision_templates.id, { onDelete: "cascade" }),
  category_id: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  planned_amount: numeric("planned_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
});

export const provision_audit_logs = pgTable("provision_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  category_id: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  previous_amount: numeric("previous_amount", { precision: 14, scale: 2 }),
  new_amount: numeric("new_amount", { precision: 14, scale: 2 }),
  context: jsonb("context")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const provision_recurring_rules = pgTable("provision_recurring_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  group_id: uuid("group_id")
    .notNull()
    .references(() => financial_groups.id, { onDelete: "cascade" }),
  category_id: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  planned_amount: numeric("planned_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  start_month: integer("start_month").notNull(),
  start_year: integer("start_year").notNull(),
  end_month: integer("end_month"),
  end_year: integer("end_year"),
  apply_automatically: boolean("apply_automatically").default(true).notNull(),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  notes: text("notes"),
});

// ==== CATEGORY PRESETS ====
export const category_presets = pgTable("category_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  parent_id: uuid("parent_id").$type<string | null>(),
  name: varchar("name", { length: 191 }).notNull(),
  icon: varchar("icon", { length: 191 }).default("").notNull(),
  color: varchar("color", { length: 32 }).default("#cccccc").notNull(),
  type: categoryType("type").notNull(), // "expense" | "income"
  created_at: timestamp("created_at").defaultNow().notNull(),
});
// ================
// NOTES / GUIDELINES
// ================
// - Model 2 chosen: credit_cards are independent resources. Transactions created
//   as card purchases SHOULD set `credit_card_id` (not `account_id`).
// - When user pays a credit card bill, create a standard `transaction` of
//   method = 'debit' and set `account_id` to the paying account and optionally
//   link it to the credit_card_bill via `credit_bill_id`.
// - `credit_card_bill_items.transaction_id` is optional but handy to link the
//   original transaction that created the card charge. When creating a card
//   purchase, create the transaction, create the bill_item and link them.

// If you want, posso também gerar as migrations SQL (create table statements) e
// exemplos de queries para: 1) criar compra no cartão e 2) pagar fatura.
// Basta me pedir.
