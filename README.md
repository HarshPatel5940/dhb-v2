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