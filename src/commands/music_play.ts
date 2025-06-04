import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  type TextChannel,
} from "discord.js";
import { LoadType, type Playlist, type Track } from "shoukaku";
import type { MusicCommand } from "../interface/musicCommand.js";
import {
  checkMusicPermissions,
  getVoiceChannel,
} from "../interface/musicCommand.js";
import type { UserTrack } from "../music/MusicQueue.js";
import { getMusicManager } from "../utils/musicManager.js";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music from a URL or search query")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("URL or search query")
        .setRequired(true)
    )
    .setDMPermission(false),

  requiresVoiceChannel: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const permissionCheck = checkMusicPermissions(interaction, this);
    if (!permissionCheck.success) {
      return await interaction.reply({
        content: permissionCheck.error,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query", true);
    const voiceChannel = getVoiceChannel(interaction);
    const textChannel = interaction.channel as TextChannel;

    if (!voiceChannel) {
      return await interaction.editReply({
        content: "❌ Could not find your voice channel!",
      });
    }

    try {
      const musicManager = getMusicManager();

      if (!interaction.guild) {
        return await interaction.editReply({
          content: "❌ This command can only be used in a server!",
        });
      }

      const queue = await musicManager.createQueue({
        guild: interaction.guild,
        voiceChannel,
        textChannel,
      });

      let searchQuery = `scsearch:${query}`;
      try {
        new URL(query);
      } catch {
        searchQuery = `scsearch:${query}`;
      }

      const node = musicManager.shoukaku.getIdealNode();
      if (!node) {
        return await interaction.editReply({
          content: "❌ No music nodes are available right now!",
        });
      }

      const result = await node.rest.resolve(searchQuery);

      if (
        !result ||
        [LoadType.Error, LoadType.Empty].includes(result.loadType)
      ) {
        return await interaction.editReply({
          content: "❌ No results found for your query!",
        });
      }

      let addedTracks = 0;
      const userId = interaction.user.id;

      if (result.loadType === LoadType.Playlist) {
        const playlistData = result.data as Playlist;
        const tracks: UserTrack[] = playlistData.tracks
          .filter(
            (track): track is Track =>
              track?.encoded != null && track?.info != null
          )
          .map((track: Track) => ({
            encoded: track.encoded as string,
            info: track.info as Track["info"],
            pluginInfo: track.pluginInfo,
            userId,
            requestedBy: interaction.user.username,
          }));

        queue.addTracks(tracks);
        addedTracks = tracks.length;

        await interaction.editReply({
          content: `✅ Added **${playlistData.info.name}** playlist with **${addedTracks}** tracks to the queue!`,
        });
      } else {
        const track =
          result.loadType === LoadType.Search
            ? (result.data as Track[])[0]
            : (result.data as Track);

        if (!track || !track.encoded || !track.info) {
          return await interaction.editReply({
            content: "❌ Invalid track data received!",
          });
        }

        const userTrack: UserTrack = {
          encoded: track.encoded,
          info: track.info,
          pluginInfo: track.pluginInfo,
          userId,
          requestedBy: interaction.user.username,
        };

        queue.addTrack(userTrack);
        addedTracks = 1;

        await interaction.editReply({
          content: `✅ Added **${track.info.title}** to the queue!`,
        });
      }

      if (queue.stopped && addedTracks > 0) {
        await queue.play();
      }
    } catch (error) {
      console.error("Error in play command:", error);
      await interaction.editReply({
        content: "❌ An error occurred while trying to play music!",
      });
    }
  },
} as MusicCommand;
