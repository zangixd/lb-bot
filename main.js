import { Client, Events, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { commandHandler } from './utils/command-handler.js';
import { eventHandler } from './utils/event-handler.js';

// Init client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = await commandHandler(); // Load commands
eventHandler(client); // Load event listeners

client.login(process.env.DISCORD_APP_TOKEN);