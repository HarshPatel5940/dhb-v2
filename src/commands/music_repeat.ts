import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { MusicCommand } from "../interface/musicCommand.js";
import { checkMusicPermissions } from "../interface/musicCommand.js";
import { RepeatMode } from "../music/MusicQueue.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Set the repeat mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Repeat mode")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Track", value: "track" },
          { name: "Queue", value: "queue" }
        )
    )
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

    const mode = interaction.options.getString("mode", true);
    let repeatMode: RepeatMode;
    let modeText: string;

    switch (mode) {
      case "off":
        repeatMode = RepeatMode.OFF;
        modeText = "Off";
        break;
      case "track":
        repeatMode = RepeatMode.TRACK;
        modeText = "Track";
        break;
      case "queue":
        repeatMode = RepeatMode.QUEUE;
        modeText = "Queue";
        break;
      default:
        return await interaction.reply({
          content: "❌ Invalid repeat mode!",
          ephemeral: true,
        });
    }

    queue.setRepeatMode(repeatMode);

    const emoji = {
      [RepeatMode.OFF]: "🔕",
      [RepeatMode.TRACK]: "🔂",
      [RepeatMode.QUEUE]: "🔁",
    }[repeatMode];

    await interaction.reply({
      content: `${emoji} Repeat mode set to **${modeText}**!`,
    });
  },
} as MusicCommand;
