import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { checkMusicPermissions } from "../interface/musicCommand.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnect the bot from the voice channel")
    .setDMPermission(false),

  requiresVoiceChannel: true,
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
        content: "❌ The bot is not connected to a voice channel!",
        ephemeral: true,
      });
    }

    await musicManager.destroyQueue(interaction.guild?.id);
    await interaction.reply({
      content: "👋 Disconnected from the voice channel!",
    });
  },
} as MusicCommand;
