import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { checkMusicPermissions } from "../interface/musicCommand.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffle the current queue")
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

    if (queue.tracks.length <= 1) {
      return await interaction.reply({
        content: "❌ Need at least 2 tracks in the queue to shuffle!",
        ephemeral: true,
      });
    }

    queue.shuffle();
    await interaction.reply({
      content: `🔀 Shuffled the queue with **${queue.tracks.length}** tracks!`,
    });
  },
} as MusicCommand;
