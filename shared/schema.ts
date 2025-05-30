import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  inputText: text("input_text").notNull(),
  outputText: text("output_text"),
  instructions: text("instructions"),
  llmProvider: text("llm_provider").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentSources = pgTable("content_sources", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  content: text("content").notNull(),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedInstructions = pgTable("saved_instructions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  userId: true,
  title: true,
  inputText: true,
  outputText: true,
  instructions: true,
  llmProvider: true,
});

export const insertContentSourceSchema = createInsertSchema(contentSources).pick({
  documentId: true,
  content: true,
  source: true,
});

export const insertSavedInstructionsSchema = createInsertSchema(savedInstructions).pick({
  userId: true,
  name: true,
  instructions: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;
export type ContentSource = typeof contentSources.$inferSelect;

export type InsertSavedInstructions = z.infer<typeof insertSavedInstructionsSchema>;
export type SavedInstructions = typeof savedInstructions.$inferSelect;

// API schemas
export const processTextSchema = z.object({
  inputText: z.string().min(1, "Input text is required"),
  contentSource: z.string().optional().default(""),
  instructions: z.string().optional().default(""),
  llmProvider: z.enum(["openai", "anthropic", "perplexity"]),
  useContentSource: z.boolean().default(false),
  reprocessOutput: z.boolean().default(false),
});

export const detectAiSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const searchOnlineSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

export const sendEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  text: z.string().min(1, "Email body is required"),
});
