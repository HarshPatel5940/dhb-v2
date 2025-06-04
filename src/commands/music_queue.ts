import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { getMusicManager } from "../utils/musicManager.js";

function formatDuration(ms: number): string {
	if (ms === 0) return "🔴 LIVE";

	const seconds = Math.floor(ms / 1000);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
			.toString()
			.padStart(2, "0")}`;
	}
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default {
	data: new SlashCommandBuilder()
		.setName("queue")
		.setDescription("Show the current music queue")
		.addIntegerOption(option =>
			option
				.setName("page")
				.setDescription("Page number to view")
				.setMinValue(1),
		)
		.setDMPermission(false),

	async execute(interaction: ChatInputCommandInteraction) {
		const musicManager = getMusicManager();
		if (!interaction.guild) {
			return await interaction.reply({
				content: "❌ This command can only be used in a server!",
				ephemeral: true,
			});
		}

		const queue = musicManager.getQueue(interaction.guild.id);

		if (!queue) {
			return await interaction.reply({
				content: "❌ There is no music queue for this server!",
				ephemeral: true,
			});
		}

		const queueInfo = queue.getQueueInfo();
		const page = interaction.options.getInteger("page") || 1;
		const tracksPerPage = 10;
		const startIndex = (page - 1) * tracksPerPage;
		const endIndex = startIndex + tracksPerPage;
		const tracks = queueInfo.upcoming.slice(startIndex, endIndex);

		const embed = new EmbedBuilder()
			.setColor(0x7289da)
			.setTitle("🎵 Music Queue")
			.setTimestamp();

		if (queueInfo.current) {
			embed.addFields([
				{
					name: "🎶 Currently Playing",
					value: `**${queueInfo.current.info.title}**\nRequested by: <@${queueInfo.current.userId}>`,
					inline: false,
				},
			]);
		}

		if (tracks.length === 0 && !queueInfo.current) {
			embed.setDescription("The queue is empty!");
		} else if (tracks.length === 0) {
			embed.addFields([
				{
					name: "📄 Queue",
					value: "No upcoming tracks",
					inline: false,
				},
			]);
		} else {
			const queueDescription = tracks
				.map((track, index) => {
					const position = startIndex + index + 1;
					const duration = formatDuration(track.info.length);
					return `**${position}.** [${track.info.title}](${
						track.info.uri || "https://example.com"
					}) \`[${duration}]\`\nRequested by: <@${track.userId}>`;
				})
				.join("\n\n");

			embed.addFields([
				{
					name: `📄 Queue - Page ${page}`,
					value: queueDescription,
					inline: false,
				},
			]);
		}

		const totalPages = Math.ceil(queueInfo.upcoming.length / tracksPerPage);
		const totalDuration = formatDuration(queueInfo.totalDuration);

		embed.setFooter({
			text: `Page ${page}/${totalPages || 1} • ${
				queueInfo.upcoming.length
			} tracks • Total duration: ${totalDuration}`,
		});

		await interaction.reply({ embeds: [embed] });
	},
} as MusicCommand;
