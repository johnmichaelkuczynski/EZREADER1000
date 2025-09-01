import { type Document, type RewriteJob, type InsertDocument, type InsertRewriteJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  
  // Rewrite job operations
  createRewriteJob(job: InsertRewriteJob): Promise<RewriteJob>;
  getRewriteJob(id: string): Promise<RewriteJob | undefined>;
  updateRewriteJob(id: string, updates: Partial<RewriteJob>): Promise<RewriteJob>;
  listRewriteJobs(): Promise<RewriteJob[]>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private rewriteJobs: Map<string, RewriteJob>;

  constructor() {
    this.documents = new Map();
    this.rewriteJobs = new Map();
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createRewriteJob(insertJob: InsertRewriteJob): Promise<RewriteJob> {
    const id = randomUUID();
    const job: RewriteJob = {
      ...insertJob,
      id,
      createdAt: new Date(),
    };
    this.rewriteJobs.set(id, job);
    return job;
  }

  async getRewriteJob(id: string): Promise<RewriteJob | undefined> {
    return this.rewriteJobs.get(id);
  }

  async updateRewriteJob(id: string, updates: Partial<RewriteJob>): Promise<RewriteJob> {
    const existingJob = this.rewriteJobs.get(id);
    if (!existingJob) {
      throw new Error(`Rewrite job with id ${id} not found`);
    }
    
    const updatedJob = { ...existingJob, ...updates };
    this.rewriteJobs.set(id, updatedJob);
    return updatedJob;
  }

  async listRewriteJobs(): Promise<RewriteJob[]> {
    return Array.from(this.rewriteJobs.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
}

export const storage = new MemStorage();
