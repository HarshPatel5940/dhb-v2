import {
  ChannelType,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { counterCache } from "../events/handleCounterGame.js";
import type { Command } from "../interface/command.js";
import { ModerationService } from "../service-classes/ModHelper.js";
import prisma from "../utils/prisma.js";

export default {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage moderation settings for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View current moderation settings"),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-mod-log")
        .setDescription("Set the moderation log channel")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription(
              "Channel for moderation logs (leave empty to remove)",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-server-log")
        .setDescription("Set the server log channel")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel for server logs (leave empty to remove)")
            .setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-counter-channel")
        .setDescription("Set the counter game channel")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription(
              "Channel for the counter game (leave empty to remove)",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-counter-goal")
        .setDescription("Set the counter game goal")
        .addIntegerOption(option =>
          option
            .setName("goal")
            .setDescription("The target number for the counter game")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10000),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("reset-counter")
        .setDescription("Reset the current counter to 0"),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-mod-role")
        .setDescription("Set a role required for moderation commands")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription(
              "Role required for moderation (leave empty to remove)",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-welcome-channel")
        .setDescription("Set the welcome channel for new member messages")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription(
              "Channel for welcome messages (leave empty to remove)",
            )
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("set-main-role")
        .setDescription("Set the main role for lockdown operations")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription(
              "Main role for lockdown system (leave empty to remove)",
            )
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return await interaction.reply({
        content: "❌ This command can only be used in a server!",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "view":
          await handleView(interaction);
          break;
        case "set-mod-log":
          await handleLogChannel(interaction);
          break;
        case "set-server-log":
          await handleServerLogChannel(interaction);
          break;
        case "set-counter-channel":
          await handleCounterChannel(interaction);
          break;
        case "set-counter-goal":
          await handleCounterGoal(interaction);
          break;
        case "reset-counter":
          await handleResetCounter(interaction);
          break;
        case "set-mod-role":
          await handleModRole(interaction);
          break;
        case "set-welcome-channel":
          await handleWelcomeChannel(interaction);
          break;
        case "set-main-role":
          await handleMainRole(interaction);
          break;
        default:
          await interaction.reply({
            content: "❌ Unknown subcommand!",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("Error in config command:", error);
      await interaction.reply({
        content: "❌ An error occurred while updating moderation settings!",
        ephemeral: true,
      });
    }
  },
} as Command;

async function handleView(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const settings = await ModerationService.getOrCreateModerationSettings(
    interaction.guild.id,
  );

  const embed = new EmbedBuilder()
    .setColor(0xff6b6b)
    .setTitle("⚖️ Server Settings")
    .setDescription(`Settings for **${interaction.guild.name}**`)
    .addFields([
      {
        name: "📋 Mod Log Channel",
        value: settings.modLogChannelID
          ? `<#${settings.modLogChannelID}>`
          : "Not set",
        inline: true,
      },
      {
        name: "📊 Server Log Channel",
        value: settings.serverLogChannelID
          ? `<#${settings.serverLogChannelID}>`
          : "Not set",
        inline: true,
      },
      {
        name: "👮 Moderator Role",
        value: settings.modRoleId ? `<@&${settings.modRoleId}>` : "Not set",
        inline: true,
      },
      {
        name: "🎲 Counter Channel",
        value: settings.CounterChannelId
          ? `<#${settings.CounterChannelId}>`
          : "Not set",
        inline: true,
      },
      {
        name: "🎯 Counter Progress",
        value: `${settings.CurrentCounter || 0} / ${
          settings.GoalCounter || 100
        }`,
        inline: true,
      },
      {
        name: "👋 Welcome Channel",
        value: settings.welcomeChannelId
          ? `<#${settings.welcomeChannelId}>`
          : "Not set",
        inline: true,
      },
      {
        name: "🔒 Main Role",
        value: settings.mainRoleId ? `<@&${settings.mainRoleId}>` : "Not set",
        inline: true,
      },
      {
        name: "🪝 Mod Webhook",
        value: settings.modLogWebhookUrl ? "✅ Configured" : "❌ Not set",
        inline: true,
      },
    ])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleLogChannel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if (!channel || channel.type !== ChannelType.GuildText) {
    return await interaction.reply({
      content: "❌ Invalid channel! Please select a text channel.",
      ephemeral: true,
    });
  }

  const logChannelId = channel.id || interaction.channelId;

  let modSettings = await ModerationService.updateModerationSettings(
    interaction.guild.id,
    {
      modLogChannelID: logChannelId,
    },
  );

  if (!modSettings) {
    return await interaction.reply({
      content: "❌ Failed to update moderation settings!",
      ephemeral: true,
    });
  }

  if (!modSettings.modLogWebhookUrl || modSettings.modLogWebhookUrl === "") {
    const targetChannel = await interaction.guild.channels.fetch(logChannelId);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return await interaction.reply({
        content: "❌ Failed to fetch the channel!",
        ephemeral: true,
      });
    }

    const modLogWebhook = await targetChannel.createWebhook({
      name: `${interaction.client.user?.username} Mod Log`,
    });

    modSettings = await ModerationService.updateModerationSettings(
      interaction.guild.id,
      {
        modLogWebhookUrl: modLogWebhook.url,
      },
    );

    console.log(modSettings);

    if (!modSettings.modLogWebhookUrl) {
      return await interaction.reply({
        content: "❌ Failed to create moderation log webhook!",
        ephemeral: true,
      });
    }
  }

  await interaction.reply({
    content: `✅ Moderation log channel set to ${channel}!`,
  });
}

async function handleServerLogChannel(
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if (!channel || channel.type !== ChannelType.GuildText) {
    return await interaction.reply({
      content: "❌ Invalid channel! Please select a text channel.",
      ephemeral: true,
    });
  }

  const logChannelId = channel.id;

  let serverSettings = await ModerationService.updateModerationSettings(
    interaction.guild.id,
    {
      serverLogChannelID: logChannelId,
    },
  );

  if (!serverSettings) {
    return await interaction.reply({
      content: "❌ Failed to update server settings!",
      ephemeral: true,
    });
  }

  if (
    !serverSettings.serverLogWebhookUrl ||
    serverSettings.serverLogWebhookUrl === ""
  ) {
    const targetChannel = await interaction.guild.channels.fetch(logChannelId);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return await interaction.reply({
        content: "❌ Failed to fetch the channel!",
        ephemeral: true,
      });
    }

    const serverLogWebhook = await targetChannel.createWebhook({
      name: `${interaction.client.user?.username} Server Log`,
    });

    serverSettings = await ModerationService.updateModerationSettings(
      interaction.guild.id,
      {
        serverLogWebhookUrl: serverLogWebhook.url,
      },
    );

    if (!serverSettings.serverLogWebhookUrl) {
      return await interaction.reply({
        content: "❌ Failed to create server log webhook!",
        ephemeral: true,
      });
    }
  }

  await interaction.reply({
    content: `✅ Server log channel set to ${channel}!`,
  });
}

async function handleCounterChannel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if (channel && channel.type !== ChannelType.GuildText) {
    return await interaction.reply({
      content: "❌ Invalid channel! Please select a text channel.",
      ephemeral: true,
    });
  }

  await ModerationService.getOrCreateGuild(interaction.guild.id);
  const updatedGuild = await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: { CounterChannelId: channel?.id || null },
  });

  const cache = counterCache.get(interaction.guild.id) || {
    current: updatedGuild.CurrentCounter || 0,
    goal: updatedGuild.GoalCounter || 100,
    channelId: null,
  };
  counterCache.set(interaction.guild.id, {
    ...cache,
    channelId: channel?.id || null,
  });

  if (channel) {
    try {
      const targetChannel = await interaction.guild.channels.fetch(channel.id);
      if (targetChannel && targetChannel.type === ChannelType.GuildText) {
        await targetChannel.setRateLimitPerUser(300);
      }
    } catch (error) {
      console.log("Could not set slowmode:", error);
    }

    await interaction.reply({
      content: `✅ Counter game channel set to ${channel}! Slowmode set to 5 minutes.`,
    });
  } else {
    await interaction.reply({
      content: "✅ Counter game channel removed!",
    });
  }
}

async function handleCounterGoal(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const goal = interaction.options.getInteger("goal", true);

  await ModerationService.getOrCreateGuild(interaction.guild.id);
  const updatedGuild = await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: { GoalCounter: goal },
  });

  const cache = counterCache.get(interaction.guild.id) || {
    current: updatedGuild.CurrentCounter || 0,
    goal: 100,
    channelId: updatedGuild.CounterChannelId || null,
  };
  counterCache.set(interaction.guild.id, {
    ...cache,
    goal,
  });

  await interaction.reply({
    content: `✅ Counter game goal set to **${goal}**!`,
  });
}

async function handleResetCounter(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  await ModerationService.getOrCreateGuild(interaction.guild.id);
  const updatedGuild = await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: { CurrentCounter: 0 },
  });

  const cache = counterCache.get(interaction.guild.id) || {
    current: 0,
    goal: updatedGuild.GoalCounter || 100,
    channelId: updatedGuild.CounterChannelId || null,
  };
  counterCache.set(interaction.guild.id, {
    ...cache,
    current: 0,
  });

  await interaction.reply({
    content: "✅ Counter reset to **0**!",
  });
}

async function handleModRole(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const role = interaction.options.getRole("role");

  await ModerationService.updateModerationSettings(interaction.guild.id, {
    modRoleId: role?.id || null,
  });

  if (role) {
    await interaction.reply({
      content: `✅ Moderator role set to **${role.name}**! Users with this role can use moderation commands.`,
    });
  } else {
    await interaction.reply({
      content:
        "✅ Moderator role restriction removed! Users with Discord permissions can use moderation commands.",
    });
  }
}

async function handleWelcomeChannel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const channel = interaction.options.getChannel("channel");

  if (channel && channel.type !== ChannelType.GuildText) {
    return await interaction.reply({
      content: "❌ Invalid channel! Please select a text channel.",
      ephemeral: true,
    });
  }

  await ModerationService.getOrCreateGuild(interaction.guild.id);
  await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: { welcomeChannelId: channel?.id || null },
  });

  if (channel) {
    await interaction.reply({
      content: `✅ Welcome channel set to ${channel}! New members will receive welcome messages there.`,
    });
  } else {
    await interaction.reply({
      content: "✅ Welcome channel removed! Welcome messages are disabled.",
    });
  }
}

async function handleMainRole(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const role = interaction.options.getRole("role");

  await ModerationService.getOrCreateGuild(interaction.guild.id);
  await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: { mainRoleId: role?.id || null },
  });

  if (role) {
    await interaction.reply({
      content: `✅ Main role set to **${role.name}**! This role will be used for lockdown operations.`,
    });
  } else {
    await interaction.reply({
      content:
        "✅ Main role removed! Lockdown operations will use default behavior.",
    });
  }
}
