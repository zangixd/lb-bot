import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devCommands = [];
const commands = [];

const commandsPath = path.join(__dirname, '..', '/commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);

	const commandModule = await import(pathToFileURL(filePath).href);
	const command = commandModule.default ?? commandModule;

	if ('data' in command && 'execute' in command) {
		if (command.dev) {
			devCommands.push(command.data.toJSON());
		} else {
			commands.push(command.data.toJSON());
		}
	} else {
		console.warn(`The command at ${filePath} is missing a required 'data' or 'execute' property`);
	}
}

const rest = new REST().setToken(process.env.DISCORD_APP_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands`);
		
		const devCommandData = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID), { body: devCommands });
		const commandData = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

		console.log(`Successfully reloaded ${devCommandData.length} application (/) dev commands`);
		console.log(`Successfully reloaded ${commandData.length} application (/) commands`);
	} catch (error) {
		console.error(error);
	}
})();