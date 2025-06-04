import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../interface/command.js";
import { ModerationService } from "../service-classes/moderationService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("mod-config")
    .setDescription("Manage moderation settings for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View current moderation settings")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("log-channel")
        .setDescription("Set the moderation log channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Channel for moderation logs (leave empty to remove)"
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mod-role")
        .setDescription("Set a role required for moderation commands")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription(
              "Role required for moderation (leave empty to remove)"
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("webhook")
        .setDescription("Set the moderation log webhook URL")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription(
              "Webhook URL for moderation logs (leave empty to remove)"
            )
            .setRequired(false)
        )
    )
    .setDMPermission(false),

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
        case "log-channel":
          await handleLogChannel(interaction);
          break;
        case "mod-role":
          await handleModRole(interaction);
          break;
        case "webhook":
          await handleWebhook(interaction);
          break;
        default:
          await interaction.reply({
            content: "❌ Unknown subcommand!",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("Error in moderation-settings command:", error);
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
    interaction.guild.id
  );

  const embed = new EmbedBuilder()
    .setColor(0xff6b6b)
    .setTitle("⚖️ Moderation Settings")
    .setDescription(`Settings for **${interaction.guild.name}**`)
    .addFields([
      {
        name: "📋 Log Channel",
        value: settings.logChannelId
          ? `<#${settings.logChannelId}>`
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

  await ModerationService.updateModerationSettings(interaction.guild.id, {
    logChannelId: channel?.id || null,
  });

  if (channel) {
    await interaction.reply({
      content: `✅ Moderation log channel set to ${channel}!`,
    });
  } else {
    await interaction.reply({
      content: "✅ Moderation log channel removed!",
    });
  }
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

async function handleWebhook(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const url = interaction.options.getString("url");

  if (url && !url.includes("discord.com/api/webhooks/")) {
    return await interaction.reply({
      content:
        "❌ Invalid webhook URL! Please provide a valid Discord webhook URL.",
      ephemeral: true,
    });
  }

  await ModerationService.updateModerationSettings(interaction.guild.id, {
    modLogWebhookUrl: url || null,
  });

  if (url) {
    await interaction.reply({
      content:
        "✅ Moderation log webhook configured! Moderation actions will be sent to the webhook.",
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "✅ Moderation log webhook removed!",
    });
  }
}
