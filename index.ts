/**
 * OPEN LAMA - Local AI Intelligence Hub
 * @author open㉿openlama
 */
import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import boxen from 'boxen';
import { Dashboard } from './src/Dashboard.js';
import { AIEngine } from './src/Engine.js';
import { WhatsAppBridge } from './src/Bridge.js';
import { APIServer } from './src/Server.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const isServiceMode = process.argv.includes('--service');

async function main() {
    if (!isServiceMode) {
        Dashboard.enterAltScreen();
        Dashboard.clear();
    }
    
    const modelDir = './model';
    if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);
    const models = fs.readdirSync(modelDir).filter(f => f.endsWith('.gguf'));
    
    if (models.length === 0) {
        console.log(chalk.red("\n  [ERROR] No models found in 'model/' directory!"));
        process.exit(1);
    }

    let selectedModel = models[0];
    if (!isServiceMode && models.length > 1) {
        console.log(chalk.cyan("\n  [SYSTEM] Multiple models detected. Please select one:"));
        models.forEach((m, i) => console.log(`  ${chalk.bgBlue.white(` ${i + 1} `)} ${m}`));
        const choice = await new Promise(res => rl.question(chalk.cyan("\n  Select Model: "), res)) as string;
        const index = parseInt(choice) - 1;
        if (models[index]) selectedModel = models[index];
    }

    if (!isServiceMode) {
        Dashboard.clear();
        await Dashboard.drawBanner();
    }

    const engine = new AIEngine(path.join(modelDir, selectedModel));
    const bootSpinner = isServiceMode ? null : ora(`Initialising AI Engine (${selectedModel})...`).start();
    try {
        await engine.init();
        if (bootSpinner) bootSpinner.succeed(`AI Engine Ready: ${selectedModel}`);
    } catch (err) {
        if (bootSpinner) bootSpinner.fail("AI Engine failed to start");
        process.exit(1);
    }

    const apiServer = new APIServer(engine);
    const waBridge = new WhatsAppBridge(async (text, sessionId) => await engine.chat(text, sessionId));
    
    const showApiInfo = () => {
        const info = [
            chalk.bold.green("API SERVER DOCUMENTATION"),
            "",
            `${chalk.cyan("STATUS    :")} ${apiServer.isRunning ? chalk.green("ONLINE") : chalk.red("OFFLINE")}`,
            `${chalk.cyan("PORT      :")} ${apiServer.getPort}`,
            `${chalk.cyan("API KEY   :")} ${apiServer.getApiKey}`,
            `${chalk.cyan("ENDPOINT  :")} POST http://localhost:${apiServer.getPort}/v1/chat`,
            "",
            chalk.white("Header:"),
            chalk.gray(`  Authorization: Bearer ${apiServer.getApiKey}`),
            "",
            chalk.white("Body (JSON):"),
            chalk.gray(`  { "prompt": "Hello AI!", "sessionId": "optional-id" }`),
            "",
            chalk.white("Example Request (curl):"),
            chalk.gray(`curl -X POST http://localhost:${apiServer.getPort}/v1/chat \\`),
            chalk.gray(`  -H "Authorization: Bearer ${apiServer.getApiKey}" \\`),
            chalk.gray(`  -H "Content-Type: application/json" \\`),
            chalk.gray(`  -d '{"prompt": "Hello"}'`)
        ].join('\n');
        console.log("\n" + boxen(info, { padding: 1, borderColor: 'blue', borderStyle: 'round' }));
    };

    const shutdown = async () => {
        await engine.dispose();
        if (!isServiceMode) Dashboard.exitAltScreen();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    if (isServiceMode) {
        await waBridge.init();
        apiServer.start();
        showApiInfo();
        return;
    }

    const appLoop = async () => {
        Dashboard.clear();
        await Dashboard.drawBanner();
        Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
        
        console.log(`  ${chalk.bgBlue.white(" 1 ")} Chat Mode`);
        console.log(`  ${chalk.bgGreen.black(" 2 ")} WhatsApp Bridge`);
        console.log(`  ${chalk.bgMagenta.white(" 3 ")} Toggle WA Groups (ON/OFF)`);
        console.log(`  ${chalk.bgCyan.black(" 4 ")} API Server Toggle (ON/OFF)`);
        console.log(`  ${chalk.bgYellow.black(" 5 ")} Clear History`);
        console.log(`  ${chalk.bgRed.white(" 6 ")} Exit`);
        console.log(`  ${chalk.bgWhite.black(" 7 ")} API Documentation`);

        process.stdout.write(chalk.bold.cyan("\n  Select Action [1-6]: "));

        rl.question("", async (choice) => {
            switch (choice.trim()) {
                case '1':
                    Dashboard.clear();
                    await Dashboard.drawBanner();
                    Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                    const chatSession = async () => {
                        rl.question(chalk.bold.cyan("  User > "), async (query) => {
                            if (query.toLowerCase() === '/back') return appLoop();
                            if (query.toLowerCase() === '/clear') {
                                engine.clearSession("local-chat");
                                Dashboard.clear();
                                await Dashboard.drawBanner();
                                Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                                return chatSession();
                            }
                            const s = ora("Thinking...").start();
                            try {
                                const fullResponse = await engine.chat(query, "local-chat");
                                s.stop();
                                Dashboard.printAIResponse(fullResponse);
                                chatSession();
                            } catch (err) {
                                s.fail("Engine failed to respond");
                                chatSession();
                            }
                        });
                    };
                    chatSession();
                    break;

                case '2':
                    Dashboard.clear();
                    await Dashboard.drawBanner();
                    Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                    if (!waBridge.isConnected) await waBridge.init();
                    rl.question(chalk.bold.yellow("\n  >> Press [ENTER] to return to Main Menu"), () => appLoop());
                    break;

                case '3':
                    Dashboard.clear();
                    await Dashboard.drawBanner();
                    Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                    if (!waBridge.isConnected) {
                        console.log(chalk.red("\n  [WARNING] Please connect WhatsApp first!"));
                    } else {
                        waBridge.toggleGroup();
                    }
                    rl.question(chalk.bold.yellow("\n  >> Press [ENTER] to confirm"), () => appLoop());
                    break;

                case '4':
                    if (apiServer.isRunning) {
                        apiServer.stop();
                        appLoop();
                    } else {
                        apiServer.start();
                        Dashboard.clear();
                        await Dashboard.drawBanner();
                        Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                        showApiInfo();
                        rl.question(chalk.bold.yellow("\n  >> Press [ENTER] to return to Main Menu"), () => appLoop());
                    }
                    break;

                case '5':
                    engine.clearSession("local-chat");
                    appLoop();
                    break;

                case '6':
                    await shutdown();
                    break;

                case '7':
                    Dashboard.clear();
                    await Dashboard.drawBanner();
                    Dashboard.drawStatusLine(waBridge.isConnected, selectedModel, apiServer.isRunning, waBridge.isGroupEnabled);
                    showApiInfo();
                    rl.question(chalk.bold.yellow("\n  >> Press [ENTER] to return to Main Menu"), () => appLoop());
                    break;

                default:
                    appLoop();
                    break;
            }
        });
    };

    appLoop();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
