import {
	ChannelType,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../interface/command.js";
import { ModerationService } from "../service-classes/ModHelper.js";

export default {
	data: new SlashCommandBuilder()
		.setName("config")
		.setDescription("Manage moderation settings for this server")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand(subcommand =>
			subcommand
				.setName("view")
				.setDescription("View current moderation settings"),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("set-modlog")
				.setDescription("Set the moderation log channel")
				.addChannelOption(option =>
					option
						.setName("channel")
						.setDescription(
							"Channel for moderation logs (leave empty to remove)",
						)
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("set-modrole")
				.setDescription("Set a role required for moderation commands")
				.addRoleOption(option =>
					option
						.setName("role")
						.setDescription(
							"Role required for moderation (leave empty to remove)",
						)
						.setRequired(false),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			return await interaction.reply({
				content: "❌ This command can only be used in a server!",
				ephemeral: true,
			});
		}

		const subcommand = interaction.options.getSubcommand();

		try {
			switch (subcommand) {
				case "view":
					await handleView(interaction);
					break;
				case "set-modlog":
					await handleLogChannel(interaction);
					break;
				case "set-modrole":
					await handleModRole(interaction);
					break;
				default:
					await interaction.reply({
						content: "❌ Unknown subcommand!",
						ephemeral: true,
					});
			}
		} catch (error) {
			console.error("Error in config command:", error);
			await interaction.reply({
				content: "❌ An error occurred while updating moderation settings!",
				ephemeral: true,
			});
		}
	},
} as Command;

async function handleView(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) return;

	const settings = await ModerationService.getOrCreateModerationSettings(
		interaction.guild.id,
	);

	const embed = new EmbedBuilder()
		.setColor(0xff6b6b)
		.setTitle("⚖️ Moderation Settings")
		.setDescription(`Settings for **${interaction.guild.name}**`)
		.addFields([
			{
				name: "📋 Log Channel",
				value: settings.modLogChannelID
					? `<#${settings.modLogChannelID}>`
					: "Not set",
				inline: true,
			},
			{
				name: "👮 Moderator Role",
				value: settings.modRoleId ? `<@&${settings.modRoleId}>` : "Not set",
				inline: true,
			},
			{
				name: "🪝 Webhook URL",
				value: settings.modLogWebhookUrl ? "✅ Configured" : "❌ Not set",
				inline: true,
			},
		])
		.setTimestamp();

	await interaction.reply({ embeds: [embed] });
}

async function handleLogChannel(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) return;

	const channel = interaction.options.getChannel("channel");

	if (!channel || channel.type !== ChannelType.GuildText) {
		return await interaction.reply({
			content: "❌ Invalid channel! Please select a text channel.",
			ephemeral: true,
		});
	}

	const logChannelId = channel.id || interaction.channelId;

	let modSettings = await ModerationService.updateModerationSettings(
		interaction.guild.id,
		{
			modLogChannelID: logChannelId,
		},
	);

	if (!modSettings) {
		return await interaction.reply({
			content: "❌ Failed to update moderation settings!",
			ephemeral: true,
		});
	}

	if (!modSettings.modLogWebhookUrl || modSettings.modLogWebhookUrl === "") {
		const targetChannel = await interaction.guild.channels.fetch(logChannelId);
		if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
			return await interaction.reply({
				content: "❌ Failed to fetch the channel!",
				ephemeral: true,
			});
		}

		const modLogWebhook = await targetChannel.createWebhook({
			name: `${interaction.client.user?.username} Mod Log`,
		});

		modSettings = await ModerationService.updateModerationSettings(
			interaction.guild.id,
			{
				modLogWebhookUrl: modLogWebhook.url,
			},
		);

		console.log(modSettings);

		if (!modSettings.modLogWebhookUrl) {
			return await interaction.reply({
				content: "❌ Failed to create moderation log webhook!",
				ephemeral: true,
			});
		}
	}

	await interaction.reply({
		content: `✅ Moderation log channel set to ${channel}!`,
	});
}

async function handleModRole(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) return;

	const role = interaction.options.getRole("role");

	await ModerationService.updateModerationSettings(interaction.guild.id, {
		modRoleId: role?.id || null,
	});

	if (role) {
		await interaction.reply({
			content: `✅ Moderator role set to **${role.name}**! Users with this role can use moderation commands.`,
		});
	} else {
		await interaction.reply({
			content:
				"✅ Moderator role restriction removed! Users with Discord permissions can use moderation commands.",
		});
	}
}
