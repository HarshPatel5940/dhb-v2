import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { checkMusicPermissions } from "../interface/musicCommand.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song")
    .setDMPermission(false),

  requiresVoiceChannel: true,
  requiresQueue: true,
  requiresSameVoiceChannel: true,
  requiresPlaying: true,

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

    if (!queue.currentTrack) {
      return await interaction.reply({
        content: "❌ Nothing is currently playing!",
        ephemeral: true,
      });
    }

    if (queue.paused) {
      return await interaction.reply({
        content: "❌ The music is already paused!",
        ephemeral: true,
      });
    }

    await queue.pause();
    await interaction.reply({
      content: "⏸️ Paused the music!",
    });
  },
} as MusicCommand;
