import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { DbClient } from "../../db/client";
import {
  financial_group_members,
  financial_groups,
  users,
} from "../../db/schema";

type RequireResult = {
  user: typeof users.$inferSelect;
  groupId: string;
};

export async function requireUserAndGroup(
  db: DbClient,
  clerkId: string | null,
): Promise<RequireResult> {
  if (!clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, clerkId),
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuário não encontrado.",
    });
  }

  const membership = await db.query.financial_group_members.findFirst({
    where: eq(financial_group_members.user_id, user.id),
  });

  let groupId = membership?.group_id ?? null;

  if (!groupId) {
    const group = await db.query.financial_groups.findFirst({
      where: eq(financial_groups.owner_id, user.id),
    });
    groupId = group?.id ?? null;
  }

  if (!groupId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Grupo financeiro não encontrado.",
    });
  }

  return { user, groupId };
}

