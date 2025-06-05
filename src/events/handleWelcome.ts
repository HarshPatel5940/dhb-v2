import {
  ChannelType,
  type Client,
  EmbedBuilder,
  Events,
  type GuildMember,
} from "discord.js";
import { ModerationService } from "../service-classes/ModHelper.js";

export default {
  name: Events.GuildMemberAdd,
  once: false, // Changed to false so it runs for every new member

  execute: async (member: GuildMember, Client: Client) => {
    try {
      const guildSettings = await ModerationService.getGuild(member.guild.id);

      if (!guildSettings?.welcomeChannelId) {
        return; // No welcome channel configured
      }

      const welcomeChannel = member.guild.channels.cache.get(
        guildSettings.welcomeChannelId,
      );

      if (!welcomeChannel || welcomeChannel.type !== ChannelType.GuildText) {
        return; // Channel doesn't exist or isn't a text channel
      }

      const botMember = member.guild.members.me;

      if (
        !botMember ||
        !botMember.permissionsIn(welcomeChannel).has("SendMessages")
      ) {
        console.warn(
          `Bot does not have permission to send messages in ${welcomeChannel.name}`,
        );
        return; // Bot can't send messages in the channel
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("👋 Welcome to the Server!")
        .setDescription(`Welcome to **${member.guild.name}**, ${member}!`)
        .addFields([
          {
            name: "🎉 Member Count",
            value: `You are member #${member.guild.memberCount}`,
            inline: true,
          },
          {
            name: "📅 Account Created",
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: "📋 Getting Started",
            value: "Make sure to read the rules and enjoy your stay!",
            inline: false,
          },
        ])
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({
          text: `User ID: ${member.id}`,
        });

      await welcomeChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
  },
};
