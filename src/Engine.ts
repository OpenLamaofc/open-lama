import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";
import path from "path";

export class AIEngine {
    private model: LlamaModel | null = null;
    private context: LlamaContext | null = null;
    private sessions: Map<string, LlamaChatSession> = new Map();
    private modelName: string = "";
    private readonly MAX_SESSIONS = 50; // Maintain memory stability by limiting concurrent sessions

    constructor(private modelPath: string) {
        this.modelName = path.basename(modelPath);
    }

    /**
     * Initialize the Llama model and context.
     * Prevents duplicate initialization to save resources.
     */
    async init() {
        if (this.model) return;

        this.model = new LlamaModel({
            modelPath: this.modelPath,
        });

        this.context = new LlamaContext({
            model: this.model,
            contextSize: 2048, // Balanced context size for performance and stability
        });
    }

    /**
     * Retrieve an existing session or create a new one for the given ID.
     * Implements basic FIFO cleanup if session limit is reached.
     */
    private getOrCreateSession(sessionId: string): LlamaChatSession {
        if (!this.context) throw new Error("Engine not initialized");

        if (!this.sessions.has(sessionId)) {
            // Evict oldest session if we exceed the limit
            if (this.sessions.size >= this.MAX_SESSIONS) {
                const firstKey = this.sessions.keys().next().value;
                if (firstKey) this.sessions.delete(firstKey);
            }

            const newSession = new LlamaChatSession({
                context: this.context,
                systemPrompt: "You are OPEN LAMA, a professional and helpful local AI assistant. Keep responses concise and natural."
            });
            this.sessions.set(sessionId, newSession);
        }
        return this.sessions.get(sessionId)!;
    }

    /**
     * Process a prompt within a specific session.
     */
    async chat(prompt: string, sessionId: string = "default"): Promise<string> {
        try {
            const session = this.getOrCreateSession(sessionId);
            return await session.prompt(prompt);
        } catch (err) {
            console.error("AI Engine Prompt Error:", err);
            return "I encountered a processing error. Please try again in a moment.";
        }
    }

    /**
     * Clear memory for a specific user session.
     */
    clearSession(sessionId: string) {
        this.sessions.delete(sessionId);
    }

    /**
     * Explicitly release native resources before shutdown.
     */
    async dispose() {
        this.sessions.clear();
        this.context = null;
        this.model = null;
    }

    getModelName() {
        return this.modelName;
    }
}
