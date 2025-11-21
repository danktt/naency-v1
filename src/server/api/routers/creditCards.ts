import { eq } from "drizzle-orm";
import { z } from "zod";

import { credit_cards } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

export const creditCardsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

    const cards = await ctx.db.query.credit_cards.findMany({
      where: eq(credit_cards.group_id, groupId),
    });

    return cards.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
  }),
});
