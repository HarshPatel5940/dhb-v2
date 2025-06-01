import { Collection, REST, Routes } from "discord.js";
import config from "../config";
import type { Command, MusicCommand } from "../interface";
import { getFiles } from "./getFiles";

const commands: Collection<string, Command | MusicCommand> = new Collection();
const commandsData: JSON[] = [];

export async function loadCommands() {
	const files = await getFiles("commands");

	await Promise.all(
		files.map(async (file: string) => {
			try {
				const { default: command } = await import(file);
				if (!command?.data?.name) {
					console.log(`Invalid Command File: ${file}`);
					return;
				}
				commands.set(command.data.name, command);
				commandsData.push(command.data.toJSON());
			} catch (err) {
				console.log(`Failed to Load Command: ${file.split("/").pop()}`);
				console.error(err);
			}
		}),
	);
	console.log(`Loaded ${commands.size} commands.`);
}

export async function registerSlashCommands() {
	const rest = new REST().setToken(config.BOT_TOKEN);

	if (config.NODE_ENV.toLowerCase() === "production") {
		const setCommands = (await rest.put(
			Routes.applicationCommands(config.CLIENT_ID),
			{
				body: commandsData,
			},
		)) as unknown[];
		console.log(
			`Successfully registered ${setCommands.length} application commands. (GLOBALLY)`,
		);
	} else {
		const setCommands = (await rest.put(
			Routes.applicationGuildCommands(config.CLIENT_ID, config.DEV_GUILD_ID),
			{
				body: commandsData,
			},
		)) as unknown[];
		console.log(
			`Successfully registered ${setCommands.length} application commands. (DEVELOPMENT)`,
		);
	}
}

export function getCommands(): Collection<string, Command> {
	return commands;
}
