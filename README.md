# Discord File Monitor Bot 🤖📁

A Discord bot that monitors file changes in real-time and sends notifications to a Discord channel, similar to GitHub commit notifications. Perfect for tracking changes on Windows servers or development environments.

## Features ✨

- **Real-time file monitoring** - Watches for file additions, modifications, and deletions
- **Directory monitoring** - Tracks directory creation and removal
- **Smart buffering** - Groups multiple changes together to avoid spam
- **GitHub-like notifications** - Beautiful embed messages with color coding
- **Configurable paths** - Monitor any directory on your system
- **Ignore patterns** - Automatically ignores common files like node_modules, .git, etc.
- **Simple commands** - Check bot status and get help

## Quick Setup 🚀

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the bot token (you'll need this later)
5. Under "Privileged Gateway Intents", enable:
   - Message Content Intent

### 2. Invite Bot to Your Server

1. In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`
3. Select bot permissions: `Send Messages`, `Use Slash Commands`, `Read Message History`
4. Copy the generated URL and open it to invite the bot

### 3. Get Channel ID

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on the channel where you want notifications
3. Click "Copy ID"

### 4. Install and Configure

```bash
# Install dependencies
npm install

# Copy environment template
copy .env.example .env

# Edit .env file with your values
notepad .env
```

### 5. Configure Environment Variables

Edit the `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
CHANNEL_ID=your_channel_id_here
WATCH_PATH=./watched_files
```

### 6. Run the Bot

```bash
# Start the bot
npm start

# Or for development with auto-restart
npm run dev
```

## Configuration Options ⚙️

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Required | `MTIzNDU2Nzg5...` |
| `CHANNEL_ID` | Discord channel ID for notifications | Required | `123456789012345678` |
| `WATCH_PATH` | Path to monitor for changes | `./watched_files` | `C:\MyProject` |
| `AUTO_COMMIT` | Auto-send changes (true) or manual mode (false) | `true` | `false` |
| `ADMIN_USERS` | Comma-separated Discord user IDs with admin permissions | Hardcoded defaults | `123456789,987654321` |

### Ignored Files/Folders

The bot automatically ignores:
- `node_modules/`
- `.git/`
- Hidden files (starting with `.`)
- Temporary files (`.tmp`)
- Log files (`.log`)

## Usage 📖

### Operating Modes

**🔄 Auto Mode (Default)**
- Changes are automatically sent to Discord after a 2-second buffer
- Good for real-time monitoring
- Set `AUTO_COMMIT=true` in .env

**✋ Manual Mode**
- Changes are tracked but not sent automatically
- Use `!commit` command to send all changes when ready
- Perfect for avoiding spam during heavy development
- Set `AUTO_COMMIT=false` in .env
- Switch modes anytime with `!mode auto` or `!mode manual`

### Bot Commands

| Command | Description | Admin Only | Example |
|---------|-------------|------------|----------|
| `!status` | Show bot status and current configuration | ❌ | `!status` |
| `!commit` | Send all tracked changes as a commit summary (manual mode) | ✅ | `!commit` |
| `!clear` | Clear all tracked changes without sending them | ✅ | `!clear` |
| `!mode auto/manual` | Switch between automatic and manual commit modes | ✅ | `!mode manual` |
| `!version show` | Display current version number | ✅ | `!version show` |
| `!version 1.2.3` | Set specific version number | ✅ | `!version 1.2.3` |
| `!version major/minor/patch [number]` | Increment version (default +1) | ✅ | `!version minor 2` |
| `!help` | Display help information | ❌ | `!help` |

### Admin Permissions 👑

Most bot commands require admin permissions to prevent unauthorized use. Admin users are defined by their Discord user IDs in the configuration.

**Default Admin Users:**
- `1130574602033180734`
- `408659138030206990`

**Cross-Channel Admin Commands:**
Admin users can execute admin commands (`!commit`, `!clear`, `!mode`, `!version`) from **any channel**, but:
- Commit notifications are always sent to the configured `CHANNEL_ID`
- The bot replies in the channel where the command was used
- Non-admin commands (`!status`, `!help`) only work in the configured channel

**To add more admins:**
1. Add their Discord user IDs to the `ADMIN_USERS` environment variable (comma-separated)
2. Or modify the `adminUsers` array in `bot.js`

**How to get Discord User ID:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on a user and select "Copy User ID"

### File Change Notifications

The bot will send notifications for:
- ➕ **File Added** - New files created
- 📝 **File Modified** - Existing files changed
- 🗑️ **File Deleted** - Files removed
- 📁➕ **Directory Added** - New folders created
- 📁🗑️ **Directory Deleted** - Folders removed

### Version Numbering 🔢

- **Automatic versioning**: Each commit gets a version number (e.g., "Update 1.0.5")
- **Auto-increment**: Patch version increases automatically with each change
- **Manual control**: Set specific versions or increment major/minor versions
- **Semantic versioning**: Follows major.minor.patch format

**Version Commands:**
- `!version show` - See current version
- `!version 2.1.0` - Set specific version
- `!version major` - Increment major (resets minor/patch to 0)
- `!version minor 2` - Increment minor by 2 (resets patch to 0)
- `!version patch 5` - Increment patch by 5

### Notification Features

- **Enhanced Visual Design**: Beautiful Discord embeds with proper field layouts and icons
- **Smart Color Coding**: Green for additions, Blue for modifications, Red for deletions
- **File Type Icons**: Automatic icons based on file extensions (🟨 .js, 🟪 .lua, ⚙️ .cfg, etc.)
- **Grouped Changes**: Multiple changes are batched together with clear categorization
- **Smart File Limits**: Shows up to 8 files per change type with "and X more" for larger batches
- **Rich Summaries**: Total change counts and breakdown by type
- **Timestamps**: All notifications include when changes occurred
- **Version Tracking**: Each notification shows the current version number
- **Folder-specific Instructions**: Automatic instructions based on which folders were changed

### Smart Folder Detection 📁

The bot automatically detects changes in specific folders and provides relevant instructions:

- **Grunder folder**: Shows "Du behöver bara trycka på update i panel för att använda den nya filerna."
- **Server Grunder folder**: Shows "Du behöver ladda ner grunden på nytt för att få nya filerna."
- **Multiple folders**: Shows instructions for all affected folders

This feature works with any path containing "grunder" or "server grunder" in the name.

## Example Use Cases 💡

### 1. Development Project Monitoring
```env
WATCH_PATH=C:\Users\YourName\Documents\MyProject
```

### 2. Server Configuration Monitoring
```env
WATCH_PATH=C:\inetpub\wwwroot
```

### 3. Document Folder Monitoring
```env
WATCH_PATH=C:\Users\YourName\Documents\ImportantFiles
```

## Troubleshooting 🔧

### Common Issues

1. **Bot not responding**
   - Check if bot token is correct
   - Ensure bot has proper permissions in the channel
   - Verify the channel ID is correct

2. **No file change notifications**
   - Check if the watch path exists
   - Ensure the bot has read permissions for the directory
   - Verify the path format (use forward slashes or double backslashes)

3. **Too many notifications**
   - The bot buffers changes for 2 seconds to group them
   - Consider adjusting ignored patterns if needed

### Logs

The bot provides console output for debugging:
```
✅ Bot logged in as YourBot#1234
📺 Monitoring channel ID: 123456789012345678
📁 Created watch directory: ./watched_files
Starting file watcher for: C:\Users\Administrator\Desktop\Script\watched_files
File watcher is ready and monitoring for changes
```

## Advanced Configuration 🔧

### Custom Ignored Patterns

To modify ignored files, edit the `ignoredPaths` array in `bot.js`:

```javascript
ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.*',
    '**/*.tmp',
    '**/*.log',
    '**/*.bak',  // Add custom patterns
    '**/temp/**'
]
```

### Buffer Time

To change how long the bot waits before sending notifications, modify `BUFFER_TIME` in `bot.js`:

```javascript
const BUFFER_TIME = 5000; // 5 seconds instead of 2
```

## Security Notes 🔒

- Never commit your `.env` file to version control
- Keep your Discord bot token secure
- The bot only needs read permissions on monitored directories
- Consider running the bot as a limited user account

## License 📄

MIT License - feel free to modify and distribute!

---

**Need help?** Create an issue or check the troubleshooting section above.