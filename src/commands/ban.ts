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
    .setName("ban")
    .setDescription("Ban a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
        .setMaxLength(512)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete-days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
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
    const deleteDays = interaction.options.getInteger("delete-days") || 0;

    // Check if the target user is in the guild
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (targetMember) {
      // Check if the bot can ban this member
      if (!targetMember.bannable) {
        return await interaction.reply({
          content:
            "❌ I cannot ban this member! They may have higher permissions than me.",
          ephemeral: true,
        });
      }

      // Check if the moderator is trying to ban themselves
      if (targetMember.id === moderator.id) {
        return await interaction.reply({
          content: "❌ You cannot ban yourself!",
          ephemeral: true,
        });
      }

      // Check role hierarchy
      if (
        moderator.roles.highest.position <=
          targetMember.roles.highest.position &&
        interaction.guild.ownerId !== moderator.id
      ) {
        return await interaction.reply({
          content:
            "❌ You cannot ban this member! They have equal or higher permissions than you.",
          ephemeral: true,
        });
      }

      // Check if target is the guild owner
      if (targetMember.id === interaction.guild.ownerId) {
        return await interaction.reply({
          content: "❌ You cannot ban the server owner!",
          ephemeral: true,
        });
      }
    }

    // Check if user is already banned
    try {
      const existingBan = await interaction.guild.bans.fetch(targetUser.id);
      if (existingBan) {
        return await interaction.reply({
          content: "❌ This user is already banned!",
          ephemeral: true,
        });
      }
    } catch (error) {
      // User is not banned, continue
    }

    try {
      // Try to DM the user before banning (only if they're in the server)
      if (targetMember) {
        try {
          await targetUser.send({
            content: `🔨 You have been banned from **${interaction.guild.name}**\n**Reason:** ${reason}`,
          });
        } catch (error) {
          // User has DMs disabled or blocked the bot
          console.log("Could not DM user about ban:", error);
        }
      }

      // Perform the ban
      await interaction.guild.bans.create(targetUser.id, {
        reason,
        deleteMessageDays: deleteDays,
      });

      // Create moderation action for logging
      const moderationAction: ModerationAction = {
        type: "ban",
        target: targetUser,
        moderator: interaction.user,
        reason,
        guild: interaction.guild,
      };

      // Log the action
      await moderationService.logModerationAction(moderationAction);

      let responseMessage = `🔨 Successfully banned **${targetUser.tag}** from the server!\n**Reason:** ${reason}`;

      if (deleteDays > 0) {
        responseMessage += `\n**Messages deleted:** ${deleteDays} day${
          deleteDays === 1 ? "" : "s"
        }`;
      }

      await interaction.reply({
        content: responseMessage,
      });
    } catch (error) {
      console.error("Error banning member:", error);
      await interaction.reply({
        content: "❌ An error occurred while trying to ban the member!",
        ephemeral: true,
      });
    }
  },
} as Command;
