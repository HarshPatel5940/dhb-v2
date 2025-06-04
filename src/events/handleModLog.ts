import { type Client, Events } from "discord.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(client: Client) {
    // TODO: check for member update and if member is timedout
  },
};
