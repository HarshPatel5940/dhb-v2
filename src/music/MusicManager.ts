import { EventEmitter } from "node:events";
import type { Client, Guild, TextChannel, VoiceChannel } from "discord.js";
import { Connectors, Shoukaku } from "shoukaku";
import { MusicQueue, type QueueOptions } from "./MusicQueue";

export interface LavalinkNode {
  name: string;
  host: string;
  port: number;
  password: string;
  secure?: boolean;
}

export class MusicManager extends EventEmitter {
  public readonly client: Client;
  public readonly shoukaku: Shoukaku;
  public readonly queues: Map<string, MusicQueue>;

  constructor(client: Client, nodes: LavalinkNode[]) {
    super();
    this.client = client;
    this.queues = new Map();

    const shoukakuNodes = nodes.map((node) => ({
      name: node.name,
      url: `${node.secure ? "wss" : "ws"}://${node.host}:${node.port}`,
      auth: node.password,
      secure: node.secure || false,
    }));

    this.shoukaku = new Shoukaku(
      new Connectors.DiscordJS(client),
      shoukakuNodes,
      {
        resumeByLibrary: true,
        resumeTimeout: 30,
      }
    );

    this.setupEvents();
  }

  private setupEvents(): void {
    this.shoukaku
      .on("ready", (name: string) => {
        console.log(`Lavalink Node: ${name} is now ready`);
        this.emit("nodeReady", name);
      })
      .on("disconnect", (name: string) => {
        console.warn(`Lavalink Node: ${name} is disconnected`);
        this.emit("nodeDisconnect", name);
      })
      .on("error", (_, error) => {
        console.error("Lavalink threw an error:", error);
        this.emit("nodeError", error);
      });
  }

  public async createQueue(options: QueueOptions): Promise<MusicQueue> {
    let queue = this.queues.get(options.guild.id);

    if (queue) {
      if (queue.voiceChannel.id !== options.voiceChannel.id) {
        await queue.disconnect();
        queue = undefined;
      } else {
        return queue;
      }
    }

    queue = new MusicQueue(this, options);
    this.queues.set(options.guild.id, queue);

    queue.on("disconnect", () => {
      this.queues.delete(options.guild.id);
    });

    await queue.connect();
    return queue;
  }

  public getQueue(guildId: string): MusicQueue | undefined {
    return this.queues.get(guildId);
  }

  public async destroyQueue(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (queue) {
      await queue.disconnect();
      this.queues.delete(guildId);
    }
  }

  public async destroyAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map((queue) =>
      queue.disconnect()
    );
    await Promise.allSettled(promises);
    this.queues.clear();
  }
}
