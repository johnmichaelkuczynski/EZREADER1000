import { 
  type User, type InsertUser, 
  type Document, type InsertDocument,
  type ContentSource, type InsertContentSource,
  type SavedInstructions, type InsertSavedInstructions
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, documents, contentSources, savedInstructions } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Content source operations
  getContentSource(id: number): Promise<ContentSource | undefined>;
  getContentSourcesByDocumentId(documentId: number): Promise<ContentSource[]>;
  createContentSource(contentSource: InsertContentSource): Promise<ContentSource>;
  updateContentSource(id: number, contentSource: Partial<InsertContentSource>): Promise<ContentSource | undefined>;
  deleteContentSource(id: number): Promise<boolean>;
  
  // Saved instructions operations
  getSavedInstructions(id: number): Promise<SavedInstructions | undefined>;
  getSavedInstructionsByUserId(userId: number): Promise<SavedInstructions[]>;
  createSavedInstructions(savedInstructions: InsertSavedInstructions): Promise<SavedInstructions>;
  updateSavedInstructions(id: number, savedInstructions: Partial<InsertSavedInstructions>): Promise<SavedInstructions | undefined>;
  deleteSavedInstructions(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }
  
  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId));
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }
  
  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return Boolean(result.rowCount);
  }
  
  // Content source operations
  async getContentSource(id: number): Promise<ContentSource | undefined> {
    const [contentSource] = await db.select().from(contentSources).where(eq(contentSources.id, id));
    return contentSource;
  }
  
  async getContentSourcesByDocumentId(documentId: number): Promise<ContentSource[]> {
    return await db.select().from(contentSources).where(eq(contentSources.documentId, documentId));
  }
  
  async createContentSource(contentSource: InsertContentSource): Promise<ContentSource> {
    const [newContentSource] = await db.insert(contentSources).values(contentSource).returning();
    return newContentSource;
  }
  
  async updateContentSource(id: number, contentSource: Partial<InsertContentSource>): Promise<ContentSource | undefined> {
    const [updatedContentSource] = await db
      .update(contentSources)
      .set(contentSource)
      .where(eq(contentSources.id, id))
      .returning();
    return updatedContentSource;
  }
  
  async deleteContentSource(id: number): Promise<boolean> {
    const result = await db.delete(contentSources).where(eq(contentSources.id, id));
    return Boolean(result.rowCount);
  }
  
  // Saved instructions operations
  async getSavedInstructions(id: number): Promise<SavedInstructions | undefined> {
    const [savedInstruction] = await db.select().from(savedInstructions).where(eq(savedInstructions.id, id));
    return savedInstruction;
  }
  
  async getSavedInstructionsByUserId(userId: number): Promise<SavedInstructions[]> {
    return await db.select().from(savedInstructions).where(eq(savedInstructions.userId, userId));
  }
  
  async createSavedInstructions(instruction: InsertSavedInstructions): Promise<SavedInstructions> {
    const [newInstruction] = await db.insert(savedInstructions).values(instruction).returning();
    return newInstruction;
  }
  
  async updateSavedInstructions(id: number, instruction: Partial<InsertSavedInstructions>): Promise<SavedInstructions | undefined> {
    const [updatedInstruction] = await db
      .update(savedInstructions)
      .set(instruction)
      .where(eq(savedInstructions.id, id))
      .returning();
    return updatedInstruction;
  }
  
  async deleteSavedInstructions(id: number): Promise<boolean> {
    const result = await db.delete(savedInstructions).where(eq(savedInstructions.id, id));
    return Boolean(result.rowCount);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private contentSources: Map<number, ContentSource>;
  private savedInstructions: Map<number, SavedInstructions>;
  
  private currentUserId: number;
  private currentDocumentId: number;
  private currentContentSourceId: number;
  private currentSavedInstructionsId: number;
  
  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.contentSources = new Map();
    this.savedInstructions = new Map();
    
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentContentSourceId = 1;
    this.currentSavedInstructionsId = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.userId === userId);
  }
  
  async createDocument(document: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: now,
      instructions: document.instructions || null,
      userId: document.userId || null,
      outputText: document.outputText || null
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }
  
  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) return undefined;
    
    const updatedDocument: Document = { ...existingDocument, ...document };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  // Content source operations
  async getContentSource(id: number): Promise<ContentSource | undefined> {
    return this.contentSources.get(id);
  }
  
  async getContentSourcesByDocumentId(documentId: number): Promise<ContentSource[]> {
    return Array.from(this.contentSources.values()).filter(source => source.documentId === documentId);
  }
  
  async createContentSource(contentSource: InsertContentSource): Promise<ContentSource> {
    const id = this.currentContentSourceId++;
    const now = new Date();
    const newContentSource: ContentSource = { 
      ...contentSource, 
      id, 
      createdAt: now,
      source: contentSource.source || null,
      documentId: contentSource.documentId || null
    };
    this.contentSources.set(id, newContentSource);
    return newContentSource;
  }
  
  async updateContentSource(id: number, contentSource: Partial<InsertContentSource>): Promise<ContentSource | undefined> {
    const existingContentSource = this.contentSources.get(id);
    if (!existingContentSource) return undefined;
    
    const updatedContentSource: ContentSource = { ...existingContentSource, ...contentSource };
    this.contentSources.set(id, updatedContentSource);
    return updatedContentSource;
  }
  
  async deleteContentSource(id: number): Promise<boolean> {
    return this.contentSources.delete(id);
  }
  
  // Saved instructions operations
  async getSavedInstructions(id: number): Promise<SavedInstructions | undefined> {
    return this.savedInstructions.get(id);
  }
  
  async getSavedInstructionsByUserId(userId: number): Promise<SavedInstructions[]> {
    return Array.from(this.savedInstructions.values()).filter(instruction => instruction.userId === userId);
  }
  
  async createSavedInstructions(instruction: InsertSavedInstructions): Promise<SavedInstructions> {
    const id = this.currentSavedInstructionsId++;
    const now = new Date();
    const newInstruction: SavedInstructions = { 
      ...instruction, 
      id, 
      createdAt: now,
      userId: instruction.userId || null
    };
    this.savedInstructions.set(id, newInstruction);
    return newInstruction;
  }
  
  async updateSavedInstructions(id: number, instruction: Partial<InsertSavedInstructions>): Promise<SavedInstructions | undefined> {
    const existingInstruction = this.savedInstructions.get(id);
    if (!existingInstruction) return undefined;
    
    const updatedInstruction: SavedInstructions = { ...existingInstruction, ...instruction };
    this.savedInstructions.set(id, updatedInstruction);
    return updatedInstruction;
  }
  
  async deleteSavedInstructions(id: number): Promise<boolean> {
    return this.savedInstructions.delete(id);
  }
}

// Use MemStorage for development as instructed in the guidelines
export const storage = new MemStorage();
