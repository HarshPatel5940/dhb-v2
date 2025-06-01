import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { checkMusicPermissions } from "../interface/musicCommand.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
	data: new SlashCommandBuilder()
		.setName("volume")
		.setDescription("Set the music volume")
		.addIntegerOption(option =>
			option
				.setName("level")
				.setDescription("Volume level (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100),
		)
		.setDMPermission(false),

	requiresVoiceChannel: true,
	requiresQueue: true,
	requiresSameVoiceChannel: true,

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			return await interaction.reply({
				content: "❌ This command can only be used in a server!",
				ephemeral: true,
			});
		}

		const permissionCheck = checkMusicPermissions(interaction, this);
		if (!permissionCheck.success) {
			return await interaction.reply({
				content: permissionCheck.error,
				ephemeral: true,
			});
		}

		const musicManager = getMusicManager();
		const queue = musicManager.getQueue(interaction.guild?.id);

		if (!queue) {
			return await interaction.reply({
				content: "❌ There is no music queue for this server!",
				ephemeral: true,
			});
		}

		const volume = interaction.options.getInteger("level", true);
		await queue.setVolume(volume);

		const volumeEmoji = volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊";

		await interaction.reply({
			content: `${volumeEmoji} Volume set to **${volume}%**!`,
		});
	},
} as MusicCommand;
