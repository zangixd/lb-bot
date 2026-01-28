import * as fs from 'node:fs';
import * as path from 'node:path';
import { Collection } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function commandHandler() {
	const commands = new Collection();
	const commandsPath = path.join(__dirname, '..', '/commands');
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);

		const commandModule = await import(pathToFileURL(filePath).href);
		const command = commandModule.default ?? commandModule;

		if ('data' in command && 'execute' in command) {
			commands.set(command.data.name, command);
		} else {
			console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}

	return commands;
}