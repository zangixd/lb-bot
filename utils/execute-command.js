import { MessageFlags } from "discord.js";

export async function executeCommand(interaction, command) {
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

}