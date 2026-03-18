import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, positions, securityNotes } from "@/db/schema";

const DEMO_USER_ID = "demo-user";

export type UpsertSecurityNoteInput = {
  userId: string | null;
  securityId: string;
  noteId?: string;
  title: string;
  body: string;
};

export async function upsertSecurityNote(input: UpsertSecurityNoteInput) {
  const effectiveUserId = input.userId ?? DEMO_USER_ID;

  const [portfolio] = await db
    .select({
      id: portfolios.id,
    })
    .from(portfolios)
    .where(eq(portfolios.userId, effectiveUserId))
    .limit(1);

  if (!portfolio) {
    throw new Error("Portfolio not found.");
  }

  const [position] = await db
    .select({
      id: positions.id,
    })
    .from(positions)
    .where(
      and(
        eq(positions.portfolioId, portfolio.id),
        eq(positions.securityId, input.securityId),
      ),
    )
    .limit(1);

  if (!position) {
    throw new Error("Open position not found for this security.");
  }

  const normalizedTitle = input.title.trim();
  const normalizedBody = input.body.trim();

  if (input.noteId) {
    const [existing] = await db
      .select({
        id: securityNotes.id,
        securityId: securityNotes.securityId,
        title: securityNotes.title,
        body: securityNotes.body,
        createdAt: securityNotes.createdAt,
        updatedAt: securityNotes.updatedAt,
      })
      .from(securityNotes)
      .where(
        and(
          eq(securityNotes.id, input.noteId),
          eq(securityNotes.portfolioId, portfolio.id),
          eq(securityNotes.securityId, input.securityId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error("Memo not found.");
    }

    await db
      .update(securityNotes)
      .set({
        title: normalizedTitle,
        body: normalizedBody,
        updatedAt: new Date(),
      })
      .where(eq(securityNotes.id, input.noteId));

    return {
      id: existing.id,
      securityId: existing.securityId,
      title: normalizedTitle,
      body: normalizedBody,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
  }

  const noteId = randomUUID();
  const now = new Date();

  await db.insert(securityNotes).values({
    id: noteId,
    portfolioId: portfolio.id,
    securityId: input.securityId,
    title: normalizedTitle,
    body: normalizedBody,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: noteId,
    securityId: input.securityId,
    title: normalizedTitle,
    body: normalizedBody,
    createdAt: now,
    updatedAt: now,
  };
}
