import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lettersTable = pgTable("letters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  senderName: text("sender_name"),
  font: text("font").default("Special Elite"),
  inkColor: text("ink_color").default("#1a1008"),
  paperTexture: text("paper_texture").default("cream"),
  envelopeStyle: text("envelope_style").default("classic"),
  waxSealColor: text("wax_seal_color").default("#8B1A1A"),
  waxSealSymbol: text("wax_seal_symbol").default("star"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("draft"),
  shareToken: text("share_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLetterSchema = createInsertSchema(lettersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLetter = z.infer<typeof insertLetterSchema>;
export type Letter = typeof lettersTable.$inferSelect;
