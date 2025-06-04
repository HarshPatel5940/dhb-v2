import type { ModerationSettings } from "@prisma/client";
import type { Guild, GuildMember, User } from "discord.js";
import { EmbedBuilder as DiscordEmbedBuilder } from "discord.js";
import prisma from "../utils/prisma.js";

export interface ModerationAction {
  type: "ban" | "kick" | "timeout" | "timeout_remove";
  target: User;
  moderator: User;
  reason?: string;
  duration?: number;
  guild: Guild;
}

export class ModerationService {
  public static async getOrCreateModerationSettings(
    guildId: string
  ): Promise<ModerationSettings> {
    let settings = await prisma.moderationSettings.findUnique({
      where: { guildId },
    });

    if (!settings) {
      await prisma.guild.upsert({
        where: { id: guildId },
        update: {},
        create: { id: guildId },
      });

      settings = await prisma.moderationSettings.create({
        data: {
          guildId,
        },
      });
    }

    return settings;
  }

  public static async updateModerationSettings(
    guildId: string,
    updates: Partial<
      Pick<
        ModerationSettings,
        "logChannelId" | "modRoleId" | "modLogWebhookUrl"
      >
    >
  ): Promise<ModerationSettings> {
    // Ensure guild exists
    const existingGuild = await prisma.guild.findFirst({
      where: { id: guildId },
    });

    if (!existingGuild) {
      await prisma.guild.create({
        data: { id: guildId },
      });
    }

    // Get existing settings
    const existingSettings = await prisma.moderationSettings.findFirst({
      where: { guildId },
    });

    // Delete existing settings if they exist
    if (existingSettings) {
      await prisma.moderationSettings.deleteMany({
        where: { guildId },
      });
    }

    // Create new settings with updates
    return await prisma.moderationSettings.create({
      data: {
        guildId,
        logChannelId: updates.logChannelId ?? existingSettings?.logChannelId,
        modRoleId: updates.modRoleId ?? existingSettings?.modRoleId,
        modLogWebhookUrl:
          updates.modLogWebhookUrl ?? existingSettings?.modLogWebhookUrl,
      },
    });
  }
  public static async sendToModLog(
    guildId: string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    payload: { embeds: Record<string, any>[] }
  ): Promise<void> {
    try {
      const moderationService = new ModerationService();
      const settings = await moderationService.getModerationSettings(guildId);

      if (!settings?.modLogWebhookUrl) {
        return;
      }

      const response = await fetch(settings.modLogWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `Failed to send moderation log: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error sending to moderation log:", error);
    }
  }

  public async getModerationSettings(
    guildId: string
  ): Promise<ModerationSettings | null> {
    return await prisma.moderationSettings.findUnique({
      where: { guildId },
    });
  }

  public static async getModerationSettings(
    guildId: string
  ): Promise<ModerationSettings | null> {
    return await prisma.moderationSettings.findUnique({
      where: { guildId },
    });
  }

  public async hasModPermissions(
    guildId: string,
    member: GuildMember
  ): Promise<boolean> {
    const settings = await ModerationService.getModerationSettings(guildId);

    if (member.permissions.has("Administrator")) {
      return true;
    }

    if (
      member.permissions.has(["BanMembers", "KickMembers", "ModerateMembers"])
    ) {
      return true;
    }

    if (settings?.modRoleId && member.roles.cache.has(settings.modRoleId)) {
      return true;
    }

    return false;
  }

  /**
   * Log moderation action to webhook if configured
   */
  public async logModerationAction(action: ModerationAction): Promise<void> {
    try {
      const settings = await ModerationService.getModerationSettings(
        action.guild.id
      );

      if (!settings?.modLogWebhookUrl) {
        return;
      }

      const embed = ModerationService.createModerationEmbed(action);

      const response = await fetch(settings.modLogWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [embed.toJSON()],
        }),
      });

      if (!response.ok) {
        console.error(
          `Failed to send moderation log: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error logging moderation action:", error);
    }
  }

  /**
   * Create an embed for moderation action logging
   */
  private static createModerationEmbed(
    action: ModerationAction
  ): DiscordEmbedBuilder {
    const embed = new DiscordEmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `User ID: ${action.target.id}` });

    switch (action.type) {
      case "ban":
        embed
          .setTitle("🔨 Member Banned")
          .setColor(0xff0000)
          .addFields(
            {
              name: "User",
              value: `${action.target.tag} (<@${action.target.id}>)`,
              inline: true,
            },
            {
              name: "Moderator",
              value: `${action.moderator.tag} (<@${action.moderator.id}>)`,
              inline: true,
            },
            {
              name: "Reason",
              value: action.reason || "No reason provided",
              inline: false,
            }
          );
        break;

      case "kick":
        embed
          .setTitle("👢 Member Kicked")
          .setColor(0xff8c00)
          .addFields(
            {
              name: "User",
              value: `${action.target.tag} (<@${action.target.id}>)`,
              inline: true,
            },
            {
              name: "Moderator",
              value: `${action.moderator.tag} (<@${action.moderator.id}>)`,
              inline: true,
            },
            {
              name: "Reason",
              value: action.reason || "No reason provided",
              inline: false,
            }
          );
        break;

      case "timeout": {
        const duration = action.duration
          ? ModerationService.formatDuration(action.duration)
          : "Unknown duration";
        embed
          .setTitle("⏰ Member Timed Out")
          .setColor(0xffa500)
          .addFields(
            {
              name: "User",
              value: `${action.target.tag} (<@${action.target.id}>)`,
              inline: true,
            },
            {
              name: "Moderator",
              value: `${action.moderator.tag} (<@${action.moderator.id}>)`,
              inline: true,
            },
            { name: "Duration", value: duration, inline: true },
            {
              name: "Reason",
              value: action.reason || "No reason provided",
              inline: false,
            }
          );
        break;
      }

      case "timeout_remove":
        embed
          .setTitle("✅ Timeout Removed")
          .setColor(0x00ff00)
          .addFields(
            {
              name: "User",
              value: `${action.target.tag} (<@${action.target.id}>)`,
              inline: true,
            },
            {
              name: "Moderator",
              value: `${action.moderator.tag} (<@${action.moderator.id}>)`,
              inline: true,
            },
            {
              name: "Reason",
              value: action.reason || "No reason provided",
              inline: false,
            }
          );
        break;
    }

    return embed;
  }

  public async sendToModLog(
    guildId: string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    payload: { embeds: any[] }
  ): Promise<void> {
    try {
      const settings = await ModerationService.prototype.getModerationSettings(
        guildId
      );

      if (!settings?.modLogWebhookUrl) {
        return;
      }

      const response = await fetch(settings.modLogWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(
          `Failed to send moderation log: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error sending to moderation log:", error);
    }
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Parse duration string to milliseconds
   */
  public parseDuration(duration: string): number | null {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.toLowerCase().match(regex);

    if (!match || !match[1] || !match[2]) return null;

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  }
}
