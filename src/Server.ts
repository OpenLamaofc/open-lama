import express from 'express';
import cors from 'cors';
import { AIEngine } from './Engine.js';
import fs from 'fs';
import crypto from 'crypto';

export class APIServer {
    private app: express.Application;
    private server: any = null;
    private port: number = 3000;
    private apiKey: string = "";
    private readonly CONFIG_PATH = 'config.json';

    constructor(private engine: AIEngine) {
        this.app = express();
        this.loadConfig();
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Load or generate persistent API credentials.
     */
    private loadConfig() {
        if (fs.existsSync(this.CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(this.CONFIG_PATH, 'utf-8'));
            this.apiKey = config.apiKey;
            this.port = config.port || 3000;
        } else {
            // Generate a secure, unique API key on first run
            this.apiKey = "OPENLAMA-" + crypto.randomBytes(16).toString('hex');
            fs.writeFileSync(this.CONFIG_PATH, JSON.stringify({
                apiKey: this.apiKey,
                port: this.port
            }, null, 4));
        }
    }

    private setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());

        // Bearer Authentication Middleware
        this.app.use((req, res, next) => {
            const authHeader = req.headers.authorization;
            if (authHeader === `Bearer ${this.apiKey}`) {
                next();
            } else {
                res.status(401).json({ error: "Unauthorized. Invalid or missing Bearer token." });
            }
        });
    }

    private setupRoutes() {
        /**
         * @route POST /v1/chat
         * Processes a text prompt and returns the AI response.
         */
        this.app.post('/v1/chat', async (req, res) => {
            const { prompt, sessionId } = req.body;
            if (!prompt) return res.status(400).json({ error: "Prompt is required" });

            try {
                const response = await this.engine.chat(prompt, sessionId || "api-client");
                res.json({
                    id: crypto.randomUUID(),
                    object: "chat.completion",
                    created: Math.floor(Date.now() / 1000),
                    model: this.engine.getModelName(),
                    choices: [{
                        message: { role: "assistant", content: response },
                        finish_reason: "stop"
                    }]
                });
            } catch (err: any) {
                res.status(500).json({ error: err.message });
            }
        });
    }

    start() {
        if (this.server) return;
        this.server = this.app.listen(this.port, () => {
            // Server started
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    get isRunning() {
        return this.server !== null;
    }

    get getPort() {
        return this.port;
    }

    get getApiKey() {
        return this.apiKey;
    }
}
