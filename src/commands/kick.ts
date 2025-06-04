import {
  type ChatInputCommandInteraction,
  type GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../interface/command.js";
import {
  type ModerationAction,
  ModerationService,
} from "../service-classes/moderationService.js";

export default {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false)
        .setMaxLength(512)
    )
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return await interaction.reply({
        content: "❌ This command can only be used in a server!",
        ephemeral: true,
      });
    }

    const moderationService = new ModerationService();
    const moderator = interaction.member as GuildMember;

    // Check if user has moderation permissions
    const hasModPerms = await moderationService.hasModPermissions(
      interaction.guild.id,
      moderator
    );

    if (!hasModPerms) {
      return await interaction.reply({
        content: "❌ You don't have permission to use moderation commands!",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("user", true);
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    // Check if the target user is in the guild
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!targetMember) {
      return await interaction.reply({
        content: "❌ User not found in this server!",
        ephemeral: true,
      });
    }

    // Check if the bot can kick this member
    if (!targetMember.kickable) {
      return await interaction.reply({
        content:
          "❌ I cannot kick this member! They may have higher permissions than me.",
        ephemeral: true,
      });
    }

    // Check if the moderator is trying to kick themselves
    if (targetMember.id === moderator.id) {
      return await interaction.reply({
        content: "❌ You cannot kick yourself!",
        ephemeral: true,
      });
    }

    // Check role hierarchy
    if (
      moderator.roles.highest.position <= targetMember.roles.highest.position &&
      interaction.guild.ownerId !== moderator.id
    ) {
      return await interaction.reply({
        content:
          "❌ You cannot kick this member! They have equal or higher permissions than you.",
        ephemeral: true,
      });
    }

    // Check if target is the guild owner
    if (targetMember.id === interaction.guild.ownerId) {
      return await interaction.reply({
        content: "❌ You cannot kick the server owner!",
        ephemeral: true,
      });
    }

    try {
      // Try to DM the user before kicking
      try {
        await targetUser.send({
          content: `👢 You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`,
        });
      } catch (error) {
        // User has DMs disabled or blocked the bot
        console.log("Could not DM user about kick:", error);
      }

      // Perform the kick
      await targetMember.kick(reason);

      // Create moderation action for logging
      const moderationAction: ModerationAction = {
        type: "kick",
        target: targetUser,
        moderator: interaction.user,
        reason,
        guild: interaction.guild,
      };

      // Log the action
      await moderationService.logModerationAction(moderationAction);

      await interaction.reply({
        content: `👢 Successfully kicked **${targetUser.tag}** from the server!\n**Reason:** ${reason}`,
      });
    } catch (error) {
      console.error("Error kicking member:", error);
      await interaction.reply({
        content: "❌ An error occurred while trying to kick the member!",
        ephemeral: true,
      });
    }
  },
} as Command;
