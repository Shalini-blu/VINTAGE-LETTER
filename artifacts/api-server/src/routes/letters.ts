import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, lettersTable } from "@workspace/db";
import {
  CreateLetterBody,
  UpdateLetterBody,
  GetLetterParams,
  UpdateLetterParams,
  DeleteLetterParams,
  ShareLetterParams,
  GetSharedLetterParams,
  ListLettersResponse,
  GetLetterResponse,
  UpdateLetterResponse,
  DeleteLetterResponse,
  ShareLetterResponse,
  GetLetterStatsResponse,
} from "@workspace/api-zod";
import { randomBytes } from "crypto";

const router: IRouter = Router();

router.get("/letters/stats", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      status: lettersTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(lettersTable)
    .groupBy(lettersTable.status);

  const stats = { total: 0, drafts: 0, sent: 0, completed: 0 };
  for (const row of rows) {
    stats.total += row.count;
    if (row.status === "draft") stats.drafts += row.count;
    else if (row.status === "sent") stats.sent += row.count;
    else if (row.status === "completed") stats.completed += row.count;
  }

  res.json(GetLetterStatsResponse.parse(stats));
});

router.get("/letters/shared/:token", async (req, res): Promise<void> => {
  const params = GetSharedLetterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [letter] = await db
    .select()
    .from(lettersTable)
    .where(eq(lettersTable.shareToken, params.data.token));

  if (!letter) {
    res.status(404).json({ error: "Letter not found or invalid share link" });
    return;
  }

  res.json(GetLetterResponse.parse(letter));
});

router.get("/letters", async (req, res): Promise<void> => {
  const letters = await db
    .select()
    .from(lettersTable)
    .orderBy(desc(lettersTable.updatedAt));

  res.json(ListLettersResponse.parse(letters));
});

router.post("/letters", async (req, res): Promise<void> => {
  const parsed = CreateLetterBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid request body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [letter] = await db
    .insert(lettersTable)
    .values({
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail,
      senderName: parsed.data.senderName,
      font: parsed.data.font,
      inkColor: parsed.data.inkColor,
      paperTexture: parsed.data.paperTexture,
      envelopeStyle: parsed.data.envelopeStyle,
      waxSealColor: parsed.data.waxSealColor,
      waxSealSymbol: parsed.data.waxSealSymbol,
      imageUrl: parsed.data.imageUrl,
      status: parsed.data.status ?? "draft",
    })
    .returning();

  res.status(201).json(GetLetterResponse.parse(letter));
});

router.get("/letters/:id", async (req, res): Promise<void> => {
  const params = GetLetterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [letter] = await db
    .select()
    .from(lettersTable)
    .where(eq(lettersTable.id, params.data.id));

  if (!letter) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  res.json(GetLetterResponse.parse(letter));
});

router.put("/letters/:id", async (req, res): Promise<void> => {
  const params = UpdateLetterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLetterBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid request body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof lettersTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if (parsed.data.recipientName !== undefined) updateData.recipientName = parsed.data.recipientName;
  if (parsed.data.recipientEmail !== undefined) updateData.recipientEmail = parsed.data.recipientEmail;
  if (parsed.data.senderName !== undefined) updateData.senderName = parsed.data.senderName;
  if (parsed.data.font !== undefined) updateData.font = parsed.data.font;
  if (parsed.data.inkColor !== undefined) updateData.inkColor = parsed.data.inkColor;
  if (parsed.data.paperTexture !== undefined) updateData.paperTexture = parsed.data.paperTexture;
  if (parsed.data.envelopeStyle !== undefined) updateData.envelopeStyle = parsed.data.envelopeStyle;
  if (parsed.data.waxSealColor !== undefined) updateData.waxSealColor = parsed.data.waxSealColor;
  if (parsed.data.waxSealSymbol !== undefined) updateData.waxSealSymbol = parsed.data.waxSealSymbol;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [letter] = await db
    .update(lettersTable)
    .set(updateData)
    .where(eq(lettersTable.id, params.data.id))
    .returning();

  if (!letter) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  res.json(UpdateLetterResponse.parse(letter));
});

router.delete("/letters/:id", async (req, res): Promise<void> => {
  const params = DeleteLetterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(lettersTable)
    .where(eq(lettersTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  res.json(DeleteLetterResponse.parse({ success: true }));
});

router.post("/letters/:id/share", async (req, res): Promise<void> => {
  const params = ShareLetterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(lettersTable)
    .where(eq(lettersTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Letter not found" });
    return;
  }

  let token = existing.shareToken;
  if (!token) {
    token = randomBytes(16).toString("hex");
    await db
      .update(lettersTable)
      .set({ shareToken: token })
      .where(eq(lettersTable.id, params.data.id));
  }

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
  const url = `https://${domains}/shared/${token}`;

  res.json(ShareLetterResponse.parse({ token, url }));
});

export default router;
