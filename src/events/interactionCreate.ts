import {
  type Client,
  type Collection,
  Events,
  type Interaction,
} from "discord.js";
import type { Command, MusicCommand } from "../interface";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(
    interaction: Interaction,
    commands: Collection<string, Command | MusicCommand>,
    client: Client,
  ) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          console.log("Command not found");
          await interaction.reply({
            content: "Command not found",
            ephemeral: true,
          });
          return;
        }

        try {
          await command.execute(interaction);
        } catch (err) {
          console.error(err);
          if (!interaction.replied) {
            await interaction.reply({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          }
        }
      } else if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          console.log("Command not found");
          return;
        }
        try {
          if (!command.autocomplete) {
            console.error("Autocomplete not implemented for this command");
            return;
          }
          await command.autocomplete(interaction);
        } catch (err) {
          console.error(err);
        }
      }
    } catch (error) {
      console.error("Error in interaction handler:", error);
    }
  },
};
