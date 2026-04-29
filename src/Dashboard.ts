import chalk from "chalk";
import os from "os";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";

export class Dashboard {
    static clear() {
        process.stdout.write("\x1b[2J\x1b[0f");
    }

    static enterAltScreen() {
        process.stdout.write("\x1b[?1049h");
    }

    static exitAltScreen() {
        process.stdout.write("\x1b[?1049l");
    }

    static async drawBanner() {
        return new Promise((resolve) => {
            figlet("OPEN LAMA", { font: "ANSI Shadow" }, (err, data) => {
                if (data) {
                    console.log(gradient(["#00d2ff", "#3a7bd5", "#92fe9d", "#00c9ff"]).multiline(data));
                    console.log(chalk.gray(`  [SYSTEM] Local Intelligence Engaged. Waiting for commands...\n`));
                }
                resolve(true);
            });
        });
    }

    static drawStatusLine(waStatus: boolean, modelName: string, apiStatus: boolean, grpStatus: boolean) {
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024 / 1024).toFixed(2) + "GB";
        const wa = waStatus ? chalk.bgGreen.black(" RUNNING ") : chalk.bgRed.white(" OFFLINE ");
        const api = apiStatus ? chalk.bgBlue.white(" ONLINE  ") : chalk.bgGray.white(" OFFLINE ");
        const grp = grpStatus ? chalk.bgWhite.black(" ON ") : chalk.bgWhite.black(" OFF ");

        console.log(chalk.gray("  " + "─".repeat(85)));
        const line = [
            `${chalk.bold.blue("[MEM]")} ${chalk.white(mem)}`,
            `${chalk.bold.magenta(" | [MODEL]")} ${chalk.white(modelName.substring(0, 10) + "...")}`,
            `${chalk.bold.green(" | [WA]")} ${wa}`,
            `${chalk.bold.cyan(" | [API]")} ${api}`,
            `${chalk.bold.gray(" | [GRP]")} ${grp}`
        ].join(" ");

        console.log("  " + line);
        console.log(chalk.gray("  " + "─".repeat(85) + "\n"));
    }

    static printAIResponse(content: string) {
        console.log("\n" + boxen(chalk.white(content), {
            padding: 1,
            borderColor: "blue",
            borderStyle: "round",
            title: " OPEN LAMA RESPONSE ",
            titleAlignment: "left"
        }) + "\n");
    }
}
