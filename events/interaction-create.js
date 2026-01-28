import { Events } from 'discord.js';
import { executeCommand } from '../utils/execute-command.js';

export default {
	name: Events.InteractionCreate,

	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found`);
				return;
			}

			executeCommand(interaction, command);
		}
	}
}