import pkg from '@whiskeysockets/baileys';
// @ts-ignore
const makeWASocket = pkg.default || pkg;

import { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    Browsers
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import chalk from 'chalk';
import fs from 'fs';
import pino from 'pino';
import boxen from 'boxen';
import { Dashboard } from './Dashboard.js';

const logger = pino({ level: 'silent' }) as any;
const SESSION_PATH = 'session_fresh_lama';

export class WhatsAppBridge {
    public isConnected = false;
    public isGroupEnabled = false;
    private sock: any;

    constructor(private onMessage: (text: string, sessionId: string) => Promise<string>) {}

    async init() {
        // Initialize authentication state
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();

        // Create socket connection
        this.sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: logger, 
            browser: Browsers.ubuntu('OPEN LAMA Engine'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            shouldIgnoreJid: (_jid: string) => false
        });

        this.sock.ev.on('creds.update', saveCreds);

        // Handle connection updates
        this.sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                Dashboard.clear();
                Dashboard.drawBanner();
                // Render branded QR box
                qrcode.generate(qr, { small: true }, (code) => {
                    console.log("\n" + boxen(code, {
                        padding: 1,
                        margin: { left: 2, top: 0, bottom: 0, right: 0 },
                        borderColor: 'yellow',
                        borderStyle: 'round',
                        title: ' OPEN LAMA - WA PAIRING ',
                        titleAlignment: 'center'
                    }));
                });
                console.log(chalk.bold.yellow("\n  >> Scan the QR Code above to connect."));
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                this.isConnected = false;

                // Cleanup session data if logged out
                if (statusCode === DisconnectReason.loggedOut) {
                    if (fs.existsSync(SESSION_PATH)) {
                        fs.rmSync(SESSION_PATH, { recursive: true, force: true });
                    }
                } else if (shouldReconnect) {
                    this.init();
                }
            } else if (connection === 'open') {
                this.isConnected = true;
                Dashboard.clear();
                await Dashboard.drawBanner();
                console.log(boxen(chalk.bold.green("  [WHATSAPP] Connected Successfully!  "), { 
                    padding: 1, 
                    borderColor: 'green', 
                    borderStyle: 'round' 
                }));
                console.log(chalk.bold.yellow("\n  >> Press [ENTER] to return to Main Menu"));
            }
        });

        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type !== 'notify') return;

            for (const msg of m.messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const jid = msg.key.remoteJid;
                const isGroup = jid.endsWith('@g.us');
                
                // Filter group messages if disabled
                if (isGroup && !this.isGroupEnabled) continue;

                const messageType = Object.keys(msg.message)[0];
                let text = msg.message.conversation || msg.message.extendedTextMessage?.text;

                // Show typing indicator
                await this.sock.sendPresenceUpdate('composing', jid);

                if (messageType === 'imageMessage') {
                    // Vision is currently disabled for local-only compliance
                    await this.sock.sendMessage(jid, { text: "I'm currently a text-based AI and cannot 'see' images yet. Please send your request in text!" });
                } 
                else if (text) {
                    // Process text message through AI Engine with specific session ID
                    const response = await this.onMessage(text, jid);
                    await this.sock.sendMessage(jid, { text: response });
                }

                await this.sock.sendPresenceUpdate('paused', jid);
            }
        });
    }

    toggleGroup() {
        this.isGroupEnabled = !this.isGroupEnabled;
    }
}
