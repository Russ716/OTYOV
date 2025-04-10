import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
});

export type Experience = {
  text: string;
  createdAt: string;
};

export type Memory = {
  id: string;
  title: string;
  experiences: Experience[];
  inDiary: boolean;
  strikedOut: boolean;
};

export type Trait = {
  name: string;
  checked?: boolean;
  strikedOut?: boolean;
};

export type VisitedPrompt = {
  promptNumber: number;
  letters: string[];
};

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  memories: json("memories").$type<Memory[]>().default([]).notNull(),
  skills: json("skills").$type<Trait[]>().default([]).notNull(),
  resources: json("resources").$type<Trait[]>().default([]).notNull(),
  relationships: json("relationships").$type<Trait[]>().default([]).notNull(),
  marks: json("marks").$type<Trait[]>().default([]).notNull(),
  diary: json("diary").$type<Memory[]>().default([]).notNull(),
  currentPrompt: integer("current_prompt").default(1),
  currentLetter: text("current_letter").default("a").notNull(),
  visitedPrompts: json("visited_prompts").$type<VisitedPrompt[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  promptNumber: integer("prompt_number").notNull(),
  promptLetter: text("prompt_letter").notNull().default("a"),
  entry: text("entry").notNull(),
  content: text("content").notNull(),
});

export const promptHistory = pgTable("prompt_history", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").references(() => characters.id).notNull(),
  promptId: integer("prompt_id").references(() => prompts.id).notNull(),
  promptNumber: integer("prompt_number").notNull(),
  promptLetter: text("prompt_letter").notNull(),
  diceRoll: json("dice_roll").$type<{d10: number, d6: number}>().notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const characterRelations = relations(characters, ({ one, many }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
  promptHistory: many(promptHistory),
}));

export const promptHistoryRelations = relations(promptHistory, ({ one }) => ({
  character: one(characters, {
    fields: [promptHistory.characterId],
    references: [characters.id],
  }),
  prompt: one(prompts, {
    fields: [promptHistory.promptId],
    references: [prompts.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
export type PromptHistory = typeof promptHistory.$inferSelect;