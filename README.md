# DHB-v2 Discord Bot

A comprehensive Discord bot built with TypeScript, Discord.js v14, and Lavalink integration. Features advanced moderation, music playback, utility commands, and database-driven configuration management.

## 🚀 Features

### 🎵 Music System
- Full Lavalink integration for high-quality audio
- Queue management with repeat and shuffle modes
- Volume control and playback controls
- Support for various audio sources

### 🛡️ Moderation Tools
- Advanced lockdown system with role-based permissions
- User timeout, kick, and ban management
- Warning system with case tracking
- Message purging with intelligent filtering
- Channel slowmode management

### ⚙️ Server Configuration
- Welcome message system with customizable channels
- Role management for moderation and lockdown
- Comprehensive server information display
- Configurable logging system

### 🎮 Interactive Features
- Counter game with button interactions
- Echo command with modal forms
- Help system with organized command categories

## 📋 Commands

### Music Commands
| Command | Description |
|---------|-------------|
| `/music play <query>` | Play a song or add to queue |
| `/music pause` | Pause current playback |
| `/music resume` | Resume paused playback |
| `/music skip` | Skip current song |
| `/music stop` | Stop playback and clear queue |
| `/music queue` | Display current queue |
| `/music volume <level>` | Set playback volume (0-100) |
| `/music repeat <mode>` | Set repeat mode (off/track/queue) |
| `/music shuffle` | Toggle queue shuffle |
| `/music disconnect` | Disconnect bot from voice channel |

### Moderation Commands
| Command | Description |
|---------|-------------|
| `/mod ban <user> [reason]` | Ban a user from the server |
| `/mod unban <user> [reason]` | Unban a user |
| `/mod kick <user> [reason]` | Kick a user from the server |
| `/mod timeout <user> <duration> [reason]` | Timeout a user |
| `/mod warn <user> <reason>` | Warn a user |
| `/mod cases [user]` | View moderation cases |
| `/purge <amount> [user] [type]` | Delete messages with filters |
| `/slowmode set <duration> [channel]` | Enable slowmode |
| `/slowmode remove [channel]` | Disable slowmode |

### Lockdown System
| Command | Description |
|---------|-------------|
| `/lockdown setup` | Configure server lockdown with role permissions |
| `/lockdown start [reason]` | Activate server lockdown |
| `/lockdown end` | Deactivate server lockdown |

### Configuration Commands
| Command | Description |
|---------|-------------|
| `/config view` | Display current server configuration |
| `/config set-welcome-channel <channel>` | Set welcome message channel |
| `/config set-main-role <role>` | Set main member role for lockdown |

### Information Commands
| Command | Description |
|---------|-------------|
| `/info user [user]` | Display user information |
| `/info guild` | Display server information |
| `/info lavalink` | Display music system status |

### Utility Commands
| Command | Description |
|---------|-------------|
| `/ping` | Check bot latency |
| `/help [category]` | Display command help |
| `/echo` | Send a message through the bot |

### Event System
- **Welcome Messages**: Automatic new member greetings
- **Moderation Logging**: Comprehensive action logging
- **Interactive Components**: Button and modal handlers
- **Counter Game**: Engaging server activity tracking

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ (No Bun Runtime Support)
- PostgreSQL database
- Lavalink server for music functionality
- Discord bot token

### Environment Variables
```env
DISCORD_TOKEN=your_bot_token
DATABASE_URL=your_postgresql_url
LAVALINK_HOST=your_lavalink_host
LAVALINK_PORT=your_lavalink_port
LAVALINK_PASSWORD=your_lavalink_password
```

## 🤝 Contributing
This bot was developed for a specific client (appdatty) but serves as a comprehensive example of modern Discord bot architecture with TypeScript, advanced moderation features, and music integration.

## 📝 License
This project is licensed under [MPL 2.0](/LICENSE).