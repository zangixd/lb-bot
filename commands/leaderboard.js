import { SlashCommandBuilder, MessageFlags, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } from 'discord.js';
import { getLeaderboardData } from '../utils/get-leaderboard-data.js';

function formatTime(ms) {
  let hours = Math.floor(ms / 3600000);
  ms %= 3600000;
  let minutes = Math.floor(ms / 60000);
  ms %= 60000;
  let seconds = Math.floor(ms / 1000);
  let milliseconds = ms % 1000;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}:${mmm}`;
  } else {
    return `${mm}:${ss}:${mmm}`;
  }
}

async function getPage(map, page, player) {
			return await getLeaderboardData(map, page, player);
}

function createEmbed(leaderboardData, player, page) {
		// Generate Embed Description
		const lbType = leaderboardData.leaderboard_type === 'time' ? 'Times' : 'Scores';
		let entries = '';
		for (const entry of leaderboardData.entries) {
			const name = entry.player_name.replace(/([*_~`>|\\])/g, '\\$1');
			const value = leaderboardData.leaderboard_type === 'time' ? formatTime(entry.value) : entry.value.toString();

			const entryString = `**${value === '0' ? 'NA' : '#' + entry.position}** - ${value === '0' ? '~~' + name + '~~' : name } - ${value} - ${entry.date}\n`;

			entries += entryString;
		}

		if (player) {
			const name = player.replace(/([*_~`>|\\])/g, '\\$1');
			entries = entries.replace(new RegExp(`(\\*\\*#[0-9]+\\*\\* - )${name}( [0-9\-:]+)`), `### $1**${name}**$2`);
		}

		const description = entries.length > 0 ? entries : '*No leaderboard entries found.*';

		// Return Embed
		return new EmbedBuilder()
			.setColor(0x00ff00)
			.setAuthor({ name: 'Krunker Leaderboards'})
			.setTitle(`${lbType} for ${leaderboardData.map_name}`)
			.setDescription(description)
			.setFooter({ text: `Page ${page ?? 1}` });
}

function createRow(page, entriesAmount) {
		// Create Buttons
		const previousPage = new ButtonBuilder()
			.setCustomId('previousPage')
			.setLabel('<')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page === 1 ? true : false);
		
		const selectPage = new ButtonBuilder()
			.setCustomId('selectPage')
			.setLabel('Select Page')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(entriesAmount < 25 && page === 1 ? true : false);

		const nextPage = new ButtonBuilder()
			.setCustomId('nextPage')
			.setLabel('>')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(entriesAmount < 25 ? true : false);
		
		const findPlayer = new ButtonBuilder()
			.setCustomId('findPlayer')
			.setLabel('Find Player')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(entriesAmount < 25 && page === 1 ? true : false);
		
		return new ActionRowBuilder()
			.addComponents(previousPage, selectPage, nextPage, findPlayer);
}

function createSelectPageModal() {
	const modal = new ModalBuilder()
		.setCustomId('selectPageModal')
		.setTitle('Go to page')

	const input = new TextInputBuilder()
		.setCustomId('pageInput')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('Leaderboad page')

	const label = new LabelBuilder()
		.setLabel('Input desired page')
		.setTextInputComponent(input)

	modal.addLabelComponents(label)

	return modal;
}

function createFindPlayerModal() {
	const modal = new ModalBuilder()
		.setCustomId('findPlayerModal')
		.setTitle('Find a player\'s time')

	const input = new TextInputBuilder()
		.setCustomId('playerInput')
		.setStyle(TextInputStyle.Short)
		.setPlaceholder('Player name')

	const label = new LabelBuilder()
		.setLabel('Input a player\'s name')
		.setTextInputComponent(input)

	modal.addLabelComponents(label)

	return modal;
}

export default {
	dev: false,
	data: new SlashCommandBuilder().setName('leaderboard')
		.setDescription('Get leaderboard data for a certain map')
		.addStringOption((option) => option
			.setName('map')
			.setDescription('Map target for leaderboard data')
			.setRequired(true)
		)
		.addStringOption((option) => option
			.setName('page')
			.setDescription('Page number of leaderboard (25 Entries per page). Defaults to 1')
		)
		.addStringOption((option) => option
			.setName('player')
			.setDescription('Find a player\'s page and their time')
		)
	,

	async execute(interaction) {
		const map = interaction.options.getString('map');
		let page = interaction.options.getString('page') ?? 1;
		let player = interaction.options.getString('player') ?? null;

		// Retrieve leaderboard data from API
		let leaderboardData;
		try {
			leaderboardData = await getPage(map, page, player);
		} catch (err) {
			return interaction.reply({
				content: `No leaderboard found for ${map}`,
				flags: MessageFlags.Ephemeral
			});
		}
		let embed = createEmbed(leaderboardData, player, page);
		let row = createRow(page, leaderboardData.entries.length);

		const response = await interaction.reply({ 
			embeds: [embed],
			components: [row],
			withResponse: true
		});

		// Button interaction listener
		const collector = response.resource.message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 30_000,
			filter: (i) => {
				if (i.user.id !== interaction.user.id) {
					i.reply({
						content: 'Not allowed',
						flags: MessageFlags.Ephemeral
					});
					return false;
				}
				return true;
			}
		});

		collector.on('collect', async (i) => {
			collector.resetTimer();

			const button = i.customId;
			
			if (button === 'previousPage') {
				page--;

				try {
					leaderboardData = await getPage(map, page, player);
				} catch (err) {
					return i.reply({
						content: `No leaderboard found for ${map}`,
						flags: MessageFlags.Ephemeral
					});
				}

				embed = createEmbed(leaderboardData, player, page);
				row = createRow(page, leaderboardData.entries.length);

				i.update({ 
					embeds: [embed],
					components: [row]
				});

			} else if (button === 'selectPage') {
				await i.showModal(createSelectPageModal());

				try {
					let modalSubmit;
					try {
						modalSubmit = await i.awaitModalSubmit({
							filter: (m) =>
								m.customId === 'selectPageModal' &&
								m.user.id === i.user.id,
							time: 30_000
						});
					} catch {
						// modal timed out — just exit quietly
						return;
					}

					const inputPage = Number(modalSubmit.fields.getTextInputValue('pageInput'));

					if (isNaN(inputPage) || inputPage < 1) {
						return modalSubmit.reply({
							content: 'Invalid page number',
							flags: MessageFlags.Ephemeral
						});
					}

					page = inputPage;

					try {
						leaderboardData = await getPage(map, page, player);
					} catch (err) {
						return i.reply({
							content: `No leaderboard found for ${map}`,
							flags: MessageFlags.Ephemeral
						});
					}

					embed = createEmbed(leaderboardData, player, page);
					row = createRow(page, leaderboardData.entries.length);

					await modalSubmit.update({
						embeds: [embed],
						components: [row]
					});
				} catch (error) {
					console.log(error);
				}

			} else if (button === 'nextPage') {
				page++;

				try {
					leaderboardData = await getPage(map, page, player);
				} catch (err) {
					return i.reply({
						content: `No leaderboard found for ${map}`,
						flags: MessageFlags.Ephemeral
					});
				}

				embed = createEmbed(leaderboardData, player, page);
				row = createRow(page, leaderboardData.entries.length);

				i.update({ 
					embeds: [embed],
					components: [row]
				});

			} else if (button === 'findPlayer') {
				await i.showModal(createFindPlayerModal());

				let modalSubmit;
				try {
					modalSubmit = await i.awaitModalSubmit({
						filter: (m) =>
							m.customId === 'findPlayerModal' &&
							m.user.id === i.user.id,
						time: 30_000
					});
				} catch {
					// modal timed out — just exit quietly
					return;
				}

				player = modalSubmit.fields.getTextInputValue('playerInput');

				try {
					leaderboardData = await getPage(map, page, player);
				} catch (err) {
					return i.reply({
						content: `No leaderboard found for ${map}`,
						flags: MessageFlags.Ephemeral
					});
				}

				page = leaderboardData.page;
				embed = createEmbed(leaderboardData, player, page);
				row = createRow(page, leaderboardData.entries.length);

				player = null;

				await modalSubmit.update({
					embeds: [embed],
					components: [row]
				});
			}
		});

		collector.on('end', async () => {
			try {
				if (!response?.resource?.message) return;

				const disabledRow = new ActionRowBuilder()
					.addComponents(row.components.map(button => ButtonBuilder
						.from(button)
						.setDisabled(true)
					)
				);

				await response.resource.message.edit({
					components: [disabledRow]
				});
			} catch {}
		});
	}
};