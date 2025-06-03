import { EventEmitter } from "node:events";
import type { Client } from "discord.js";
import { Shoukaku, createDiscordJSOptions, Events } from "shoukaku";
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
      url: `${node.host}:${node.port}`,
      auth: node.password,
    }));

    console.log(
      "🎵 Creating Shoukaku with nodes:",
      JSON.stringify(shoukakuNodes, null, 2)
    );

    this.shoukaku = new Shoukaku(
      {
        userId: client.user?.id || "placeholder",
        nodes: shoukakuNodes,
        connectorOptions: createDiscordJSOptions(client),
      },
      {
        resume: true,
        resumeTimeout: 30,
        reconnectTries: 3,
        restTimeout: 60000,
      }
    );

    this.setupEvents();
    
    // Connect to Shoukaku after client is ready
    if (client.user?.id) {
      this.shoukaku.connect();
    } else {
      client.once('ready', () => {
        console.log(`🤖 Client ready, connecting Shoukaku with user ID: ${client.user!.id}`);
        this.shoukaku.connect();
      });
    }
  }

  private setupEvents(): void {
    console.log("🔗 Setting up Shoukaku event listeners...");
    
    this.shoukaku
      .on(Events.Ready, (node, resumed) => {
        console.log(
          `✅ Lavalink Node: ${node.name} is now ready (resumed: ${resumed})`
        );
        console.log(
          `📡 Node info: ${node.info?.version || "unknown version"} on ${
            node.info?.sourceManagers?.join(", ") || "unknown sources"
          }`
        );
        this.emit("nodeReady", node.name);
      })
      .on(Events.Disconnect, (node) => {
        console.warn(`❌ Lavalink Node: ${node.name} disconnected`);
        this.emit("nodeDisconnect", node.name);
      })
      .on(Events.Error, (node, error) => {
        console.error(`💥 Lavalink Node ${node.name} threw an error:`, error);
        this.emit("nodeError", error);
      })
      .on(Events.Reconnecting, (node, reconnectsLeft, reconnectInterval) => {
        console.log(
          `🔄 Lavalink Node: ${node.name} is reconnecting (${reconnectsLeft} tries left, interval: ${reconnectInterval}ms)`
        );
      })
      .on(Events.Debug, (info) => {
        console.log("🐛 Debug:", info);
      });

    // Log initial connection attempts
    setTimeout(() => {
      console.log(`🔍 Checking node states after initialization:`);
      this.shoukaku.nodes.forEach((node, name) => {
        console.log(`  ${name}: state=${node.state}, connected=${node.state === 1}`);
      });
    }, 2000);
  }

  public async createQueue(options: QueueOptions): Promise<MusicQueue> {
    // Check if any nodes are available
    const availableNodes = this.shoukaku.nodes.filter(
      (node) => node.state === 1
    ); // 1 = Connected
    if (availableNodes.length === 0) {
      throw new Error(
        "No Lavalink nodes are currently connected. Please ensure your Lavalink server is running and accessible."
      );
    }

    console.log(
      `📡 Found ${
        availableNodes.length
      } available Lavalink node(s): ${availableNodes
        .map((n) => n.name)
        .join(", ")}`
    );

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
