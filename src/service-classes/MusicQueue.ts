import { EventEmitter } from "node:events";
import Denque = require("denque");
import {
  EmbedBuilder,
  type Guild,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import {
  Player,
  type Track,
  type TrackEndEvent,
  type TrackStartEvent,
  type TrackStuckEvent,
  type WebSocketClosedEvent,
} from "shoukaku";
const { Events } = require("shoukaku");
import type { MusicManager } from "./MusicManager";

export interface QueueOptions {
  guild: Guild;
  voiceChannel: VoiceChannel;
  textChannel: TextChannel;
}

export interface UserTrack extends Track {
  userId: string;
  requestedBy?: string;
}

export enum RepeatMode {
  OFF = 0,
  TRACK = 1,
  QUEUE = 2,
}

export class MusicQueue extends EventEmitter {
  public readonly musicManager: MusicManager;
  public readonly guild: Guild;
  public voiceChannel: VoiceChannel;
  public textChannel: TextChannel;
  public tracks: Denque<UserTrack>;
  public player: Player | null;
  public currentTrack: UserTrack | null;
  public repeatMode: RepeatMode;
  public volume: number;
  public paused: boolean;
  public connected: boolean;
  public stopped: boolean;

  constructor(musicManager: MusicManager, options: QueueOptions) {
    super();
    this.musicManager = musicManager;
    this.guild = options.guild;
    this.voiceChannel = options.voiceChannel;
    this.textChannel = options.textChannel;
    this.tracks = new Denque();
    this.player = null;
    this.currentTrack = null;
    this.repeatMode = RepeatMode.OFF;
    this.volume = 100;
    this.paused = false;
    this.connected = false;
    this.stopped = true;
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    console.log(
      `🔗 Attempting to connect to voice channel ${this.voiceChannel.name} (${this.voiceChannel.id}) in guild ${this.guild.name} (${this.guild.id})`
    );

    try {
      const connection = await this.musicManager.shoukaku.joinVoiceChannel({
        guildId: this.guild.id,
        channelId: this.voiceChannel.id,
        shardId: this.guild.shardId,
        deaf: true,
      });

      console.log("✅ Successfully joined voice channel, creating player...");

      this.player = new Player(connection);
      this.setupPlayerEvents();
      this.connected = true;

      console.log(`🎵 Player created and ready for guild ${this.guild.id}`);
    } catch (error) {
      console.error(
        `❌ Failed to connect to voice channel in guild ${this.guild.id}:`,
        error
      );
      throw error;
    }
  }

  private setupPlayerEvents(): void {
    this.musicManager.shoukaku.on(
      Events.PlayerEvent,
      (
        node: unknown,
        data:
          | TrackStartEvent
          | TrackEndEvent
          | TrackStuckEvent
          | WebSocketClosedEvent
      ) => {
        if (data.guildId !== this.guild.id) return;

        switch (data.type) {
          case "TrackStartEvent":
            this.currentTrack = this.tracks.peekAt(0) || null;
            if (this.currentTrack) {
              this.emit("trackStart", this.currentTrack);
              this.sendNowPlayingMessage();
            }
            break;
          case "TrackEndEvent":
            this.handleTrackEnd();
            break;
          case "TrackStuckEvent":
            console.warn(`Player stuck in guild ${this.guild.id}`);
            this.skip();
            break;
          case "WebSocketClosedEvent":
            this.disconnect();
            break;
        }
      }
    );
  }

  private handleTrackEnd(): void {
    if (this.stopped) return;

    const finishedTrack = this.currentTrack;

    if (this.repeatMode !== RepeatMode.TRACK) {
      const track = this.tracks.removeOne(0);
      if (track && this.repeatMode === RepeatMode.QUEUE) {
        this.tracks.push(track);
      }
    }

    if (finishedTrack) {
      this.emit("trackEnd", finishedTrack);
    }

    this.playNext().catch((error) => {
      console.error(
        `Error playing next track in guild ${this.guild.id}:`,
        error
      );
      this.emit("error", error);
    });
  }

  public async playNext(): Promise<void> {
    if (this.tracks.length === 0) {
      this.currentTrack = null;
      this.stopped = true;
      this.emit("queueEnd");
      return;
    }

    const track = this.tracks.peekAt(0);
    if (!track || !this.player) return;

    try {
      await this.player.playTrack({ track: { encoded: track.encoded } });
      this.stopped = false;
    } catch (error) {
      console.error(`Failed to play track in guild ${this.guild.id}:`, error);
      this.tracks.removeOne(0);
      this.playNext();
    }
  }

  public addTrack(track: UserTrack): void {
    this.tracks.push(track);
  }

  public addTracks(tracks: UserTrack[]): void {
    for (const track of tracks) {
      this.tracks.push(track);
    }
  }

  public async play(): Promise<void> {
    if (!this.stopped || this.tracks.length === 0) return;
    await this.playNext();
  }

  public async pause(): Promise<void> {
    if (!this.player || this.paused) return;
    await this.player.setPaused(true);
    this.paused = true;
  }

  public async resume(): Promise<void> {
    if (!this.player || !this.paused) return;
    await this.player.setPaused(false);
    this.paused = false;
  }

  public async skip(): Promise<UserTrack | null> {
    if (!this.player || this.tracks.length === 0) return null;

    const skippedTrack = this.currentTrack;
    await this.player.stopTrack();
    return skippedTrack;
  }

  public async stop(): Promise<void> {
    if (!this.player) return;

    this.stopped = true;
    this.tracks.clear();
    this.currentTrack = null;
    await this.player.stopTrack();
  }

  public shuffle(): void {
    const tracksArray = this.tracks.toArray();
    if (tracksArray.length <= 1) return;

    for (let i = tracksArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = tracksArray[i];
      const swapTrack = tracksArray[j];
      if (temp && swapTrack) {
        tracksArray[i] = swapTrack;
        tracksArray[j] = temp;
      }
    }

    this.tracks.clear();
    for (const track of tracksArray) {
      if (track) this.tracks.push(track);
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (!this.player) return;

    this.volume = Math.max(0, Math.min(100, volume));
    await this.player.setGlobalVolume(this.volume);
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  public async disconnect(): Promise<void> {
    if (this.player) {
      this.musicManager.shoukaku.leaveVoiceChannel(this.guild.id);
    }

    this.connected = false;
    this.stopped = true;
    this.currentTrack = null;
    this.tracks.clear();
    this.emit("disconnect");
  }

  private async sendNowPlayingMessage(): Promise<void> {
    if (!this.currentTrack) return;

    const embed = new EmbedBuilder()
      .setColor(0x7289da)
      .setTitle("🎵 Now Playing")
      .setDescription(`**${this.currentTrack.info.title}**`)
      .addFields([
        {
          name: "Duration",
          value: this.formatDuration(this.currentTrack.info.length),
          inline: true,
        },
        {
          name: "Requested by",
          value: `<@${this.currentTrack.userId}>`,
          inline: true,
        },
        {
          name: "Queue",
          value: `${this.tracks.length} track(s)`,
          inline: true,
        },
      ]);

    if (this.currentTrack.info.uri) {
      embed.setURL(this.currentTrack.info.uri);
    }

    try {
      await this.textChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error(
        `Failed to send now playing message in guild ${this.guild.id}:`,
        error
      );
    }
  }

  private formatDuration(ms: number): string {
    if (ms === 0) return "🔴 LIVE";

    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  public getQueueInfo(): {
    current: UserTrack | null;
    upcoming: UserTrack[];
    totalDuration: number;
    position: number;
  } {
    const upcoming = this.tracks.toArray();
    const totalDuration = upcoming.reduce(
      (acc, track) => acc + track.info.length,
      0
    );

    return {
      current: this.currentTrack,
      upcoming,
      totalDuration,
      position: 0,
    };
  }
}
