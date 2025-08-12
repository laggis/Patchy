const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration
const config = {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.CHANNEL_ID,
    watchPath: process.env.WATCH_PATH || './watched_files', // Default to watched_files folder
    autoCommit: process.env.AUTO_COMMIT !== 'false', // Auto-send changes (set to false for manual mode)
    adminUsers: process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : ['1130574602033180734', '408659138030206990'], // Admin user IDs
    ignoredPaths: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.*',
        '**/*.tmp',
        '**/*.log',
        '**/package-lock.json'
    ]
};

// File change tracking
let changeBuffer = new Map();
let allChanges = []; // Store all changes for manual commit
let currentVersion = { major: 1, minor: 0, patch: 0 }; // Version tracking
const BUFFER_TIME = 2000; // 2 seconds to group changes

// Initialize file watcher
function initializeWatcher() {
    console.log(`Starting file watcher for: ${path.resolve(config.watchPath)}`);
    
    const watcher = chokidar.watch(config.watchPath, {
        ignored: config.ignoredPaths,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (filePath) => handleFileChange('added', filePath))
        .on('change', (filePath) => handleFileChange('modified', filePath))
        .on('unlink', (filePath) => handleFileChange('deleted', filePath))
        .on('addDir', (dirPath) => handleFileChange('directory added', dirPath))
        .on('unlinkDir', (dirPath) => handleFileChange('directory deleted', dirPath))
        .on('error', (error) => console.error('Watcher error:', error))
        .on('ready', () => console.log('File watcher is ready and monitoring for changes'));

    return watcher;
}

// Handle file changes with buffering
function handleFileChange(action, filePath) {
    const relativePath = path.relative(config.watchPath, filePath);
    const changeKey = `${action}:${relativePath}`;
    
    const changeData = {
        action,
        path: relativePath,
        fullPath: filePath,
        timestamp: new Date()
    };
    
    // Always store in allChanges for manual commit
    allChanges.push(changeData);
    
    // If auto-commit is enabled, also buffer for immediate sending
    if (config.autoCommit) {
        changeBuffer.set(changeKey, changeData);
        
        // Clear existing timeout and set new one
        if (handleFileChange.timeout) {
            clearTimeout(handleFileChange.timeout);
        }
        
        handleFileChange.timeout = setTimeout(() => {
            // Auto-increment patch version for auto-commits
        currentVersion.patch++;
        sendChangeNotification();
        changeBuffer.clear();
        }, BUFFER_TIME);
    }
}

// Send notification to Discord
async function sendChangeNotification() {
    if (changeBuffer.size === 0) return;
    
    const channel = client.channels.cache.get(config.channelId);
    if (!channel) {
        console.error('Discord channel not found!');
        return;
    }

    const changes = Array.from(changeBuffer.values());
    const embed = createChangeEmbed(changes);
    
    try {
        await channel.send({ embeds: [embed] });
        console.log(`Sent notification for ${changes.length} file changes`);
    } catch (error) {
        console.error('Error sending Discord message:', error);
    }
}

// Create Discord embed for file changes
function createChangeEmbed(changes) {
    const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
    const embed = new EmbedBuilder()
        .setTitle(`🚀 Version ${versionString} - File System Update`)
        .setColor(getEmbedColor(changes))
        .setTimestamp()
        .setFooter({ text: 'File Monitor Bot' });
    
    // Add summary field
    const totalChanges = changes.length;
    embed.addFields({
        name: '📊 Summary',
        value: `**${totalChanges}** total changes detected`,
        inline: false
    });
    
    // Check for folder-specific instructions
    const folderInstructions = getFolderInstructions(changes);
    if (folderInstructions.length > 0) {
        embed.addFields({
            name: '📋 Instructions / Instruktioner',
            value: folderInstructions.join('\n\n'),
            inline: false
        });
    }

    // Group changes by action
    const groupedChanges = changes.reduce((acc, change) => {
        if (!acc[change.action]) acc[change.action] = [];
        acc[change.action].push(change.path);
        return acc;
    }, {});

    // Add fields for each action type with enhanced formatting
    Object.entries(groupedChanges).forEach(([action, files]) => {
        const icon = getActionIcon(action);
        const filesToShow = files.slice(0, 8);
        let fileList = filesToShow.map(filePath => {
            const fileName = require('path').basename(filePath);
            const fileExt = require('path').extname(fileName).toLowerCase();
            const fileIcon = getFileIcon(fileExt);
            return `${fileIcon} \`${fileName}\``;
        }).join('\n');
        
        if (files.length > 8) {
            fileList += `\n📄 *...and ${files.length - 8} more files*`;
        }
        
        embed.addFields({
            name: `${icon} ${action.toUpperCase()} (${files.length})`,
            value: fileList || 'No files',
            inline: true
        });
    });

    return embed;
}

// Get embed color based on change types
function getEmbedColor(changes) {
    const hasDeleted = changes.some(c => c.action.includes('deleted'));
    const hasAdded = changes.some(c => c.action.includes('added'));
    const hasModified = changes.some(c => c.action === 'modified');
    
    if (hasDeleted) return 0xff4444; // Red
    if (hasAdded) return 0x44ff44;   // Green
    if (hasModified) return 0x4444ff; // Blue
    return 0xffaa00; // Orange
}

// Get icon for action type
function getActionIcon(action) {
    const icons = {
        'added': '➕',
        'modified': '📝',
        'deleted': '🗑️',
        'directory added': '📁➕',
        'directory deleted': '📁🗑️'
    };
    return icons[action] || '📄';
}

// Create commit-style embed for manual commits
function createCommitEmbed(changes, version = null) {
    const versionString = version || `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
    const embed = new EmbedBuilder()
        .setTitle(`💾 Manual Commit ${versionString} - Changes Summary`)
        .setColor(0x9b59b6)
        .setTimestamp()
        .setFooter({ text: 'Manual Commit • File Monitor Bot' });
    
    if (changes.length === 0) {
        embed.setDescription('📭 No changes to commit.');
        embed.setColor(0x95a5a6);
        return embed;
    }
    
    // Add enhanced summary field
    embed.addFields({
        name: '📊 Commit Summary',
        value: `**${changes.length}** total changes committed`,
        inline: false
    });
    
    // Check for folder-specific instructions
    const folderInstructions = getFolderInstructions(changes);
    if (folderInstructions.length > 0) {
        embed.addFields({
            name: '📋 Instructions / Instruktioner',
            value: folderInstructions.join('\n\n'),
            inline: false
        });
    }

    // Group changes by action
    const groupedChanges = changes.reduce((acc, change) => {
        if (!acc[change.action]) acc[change.action] = [];
        acc[change.action].push({
            path: change.path,
            time: change.timestamp.toLocaleTimeString()
        });
        return acc;
    }, {});

    // Create a more compact breakdown
    let changesSummary = '';
    Object.entries(groupedChanges).forEach(([action, files]) => {
        const icon = getActionIcon(action);
        changesSummary += `${icon} **${files.length}** ${action}\n`;
    });
    
    if (changesSummary) {
        embed.addFields({
            name: '📈 Change Breakdown',
            value: changesSummary,
            inline: true
        });
    }

    // Show recent files (last 12 changes)
    const recentChanges = changes.slice(-12);
    if (recentChanges.length > 0) {
        let recentList = recentChanges.map(change => {
            const fileName = require('path').basename(change.path);
            const fileExt = require('path').extname(fileName).toLowerCase();
            const fileIcon = getFileIcon(fileExt);
            const actionIcon = getActionIcon(change.action);
            
            return `${actionIcon} ${fileIcon} \`${fileName}\``;
        }).join('\n');
        
        if (changes.length > 12) {
            recentList += `\n📄 *...and ${changes.length - 12} more changes*`;
        }
        
        embed.addFields({
            name: '📝 Recent Changes',
            value: recentList,
            inline: true
        });
    }

    return embed;
}

// Get folder-specific instructions based on changed files
function getFolderInstructions(changes) {
    const instructions = [];
    const grunderChanges = changes.some(change => 
        change.path.toLowerCase().includes('grunder') && 
        !change.path.toLowerCase().includes('server grunder')
    );
    const serverGrunderChanges = changes.some(change => 
        change.path.toLowerCase().includes('server grunder')
    );
    
    if (grunderChanges) {
        instructions.push('🔄 **Grunder**: Du behöver bara trycka på update i panel för att använda den nya filerna.');
    }
    
    if (serverGrunderChanges) {
        instructions.push('📥 **Server Grunder**: Du behöver ladda ner grunden på nytt för att få nya filerna.');
    }
    
    return instructions;
}

// Helper function to get file type icons
function getFileIcon(extension) {
    const iconMap = {
        '.js': '🟨',
        '.json': '🟦',
        '.lua': '🟪',
        '.cfg': '⚙️',
        '.txt': '📄',
        '.md': '📝',
        '.html': '🌐',
        '.css': '🎨',
        '.xml': '📋',
        '.sql': '🗃️',
        '.log': '📊',
        '.ini': '⚙️',
        '.bat': '⚡',
        '.exe': '🔧',
        '.dll': '🔗',
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.gif': '🖼️',
        '.mp3': '🎵',
        '.mp4': '🎬',
        '.zip': '📦',
        '.rar': '📦',
        '.pdf': '📕'
    };
    
    return iconMap[extension] || '📄';
}

// Discord bot events
client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`📺 Monitoring channel ID: ${config.channelId}`);
    
    // Create watched directory if it doesn't exist
    if (!fs.existsSync(config.watchPath)) {
        fs.mkdirSync(config.watchPath, { recursive: true });
        console.log(`📁 Created watch directory: ${config.watchPath}`);
    }
    
    // Initialize file watcher
    initializeWatcher();
});

// Helper function to check if user is admin
function isAdmin(userId) {
    return config.adminUsers.includes(userId);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase().trim();
    
    // Allow admin commands from any channel, but regular status/help only from configured channel
    const isAdminCommand = content.startsWith('!commit') || content.startsWith('!clear') || 
                          content.startsWith('!mode') || content.startsWith('!version');
    
    if (!isAdminCommand && message.channel.id !== config.channelId) return;
    
    // Simple commands
    if (message.content === '!status') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 File Monitor Bot Status')
            .setColor(0x00ff00)
            .addFields(
                { name: '📁 Watching Path', value: `\`${path.resolve(config.watchPath)}\``, inline: false },
                { name: '📊 Active Changes Buffer', value: `${changeBuffer.size} pending changes`, inline: true },
                { name: '📈 Total Changes Tracked', value: `${allChanges.length} changes`, inline: true },
                { name: '🔄 Auto Commit Mode', value: config.autoCommit ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '🔢 Current Version', value: `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`, inline: true },
                { name: '🕐 Buffer Time', value: `${BUFFER_TIME}ms`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    if (message.content === '!commit') {
        if (!isAdmin(message.author.id)) {
            await message.reply('❌ You do not have permission to use this command.');
            return;
        }
        
        if (allChanges.length === 0) {
            await message.reply('📭 No changes to commit! Make some file changes first.');
            return;
        }
        
        // Group recent changes (last 24 hours by default, or all if less)
        const now = new Date();
        const recentChanges = allChanges.filter(change => {
            const timeDiff = now - change.timestamp;
            return timeDiff < 24 * 60 * 60 * 1000; // 24 hours
        });
        
        if (recentChanges.length === 0) {
            await message.reply('📭 No recent changes to commit (last 24 hours)!');
            return;
        }
        
        // Auto-increment patch version for commits
        currentVersion.patch++;
        const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
        
        const embed = createCommitEmbed(recentChanges, versionString);
        
        // Send commit to configured channel
        const targetChannel = client.channels.cache.get(config.channelId);
        if (targetChannel) {
            await targetChannel.send({ embeds: [embed] });
        }
        
        // Clear the changes after committing
        allChanges = [];
        
        // Reply in the channel where command was used
        await message.reply(`✅ Committed ${recentChanges.length} changes as version ${versionString} to <#${config.channelId}>`);
        console.log(`Manual commit sent with ${recentChanges.length} changes - Version ${versionString}`);
    }
    
    if (message.content === '!clear') {
        if (!isAdmin(message.author.id)) {
            await message.reply('❌ You do not have permission to use this command.');
            return;
        }
        
        const clearedCount = allChanges.length;
        allChanges = [];
        changeBuffer.clear();
        await message.reply(`🗑️ Cleared ${clearedCount} tracked changes.`);
    }
    
    if (message.content.startsWith('!mode ')) {
        if (!isAdmin(message.author.id)) {
            await message.reply('❌ You do not have permission to use this command.');
            return;
        }
        
        const mode = message.content.split(' ')[1];
        if (mode === 'auto') {
            config.autoCommit = true;
            await message.reply('🔄 **Auto-commit mode enabled!** Changes will be sent automatically.');
        } else if (mode === 'manual') {
            config.autoCommit = false;
            await message.reply('✋ **Manual mode enabled!** Use `!commit` to send changes when ready.');
        } else {
            await message.reply('❌ Invalid mode. Use `!mode auto` or `!mode manual`');
        }
    }
    
    if (message.content.startsWith('!version ')) {
        if (!isAdmin(message.author.id)) {
            await message.reply('❌ You do not have permission to use this command.');
            return;
        }
        
        const args = message.content.split(' ');
        if (args.length === 2 && args[1] === 'show') {
            const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
            await message.reply(`📋 Current version: **${versionString}**`);
        } else if (args.length === 2 && args[1].match(/^\d+\.\d+\.\d+$/)) {
            const [major, minor, patch] = args[1].split('.').map(Number);
            currentVersion = { major, minor, patch };
            await message.reply(`🔢 Version set to **${args[1]}**`);
        } else if (args.length === 3) {
            const type = args[1];
            const increment = parseInt(args[2]) || 1;
            
            if (type === 'major') {
                currentVersion.major += increment;
                currentVersion.minor = 0;
                currentVersion.patch = 0;
            } else if (type === 'minor') {
                currentVersion.minor += increment;
                currentVersion.patch = 0;
            } else if (type === 'patch') {
                currentVersion.patch += increment;
            } else {
                await message.reply('❌ Invalid version type. Use: major, minor, or patch');
                return;
            }
            
            const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
            await message.reply(`🔢 Version incremented to **${versionString}**`);
        } else {
            await message.reply('❌ Usage: `!version show`, `!version 1.2.3`, `!version major/minor/patch [increment]`');
        }
    }
    
    if (message.content === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('📖 File Monitor Bot Commands')
            .setColor(0x0099ff)
            .addFields(
                { name: '!status', value: 'Show bot status and configuration', inline: false },
                { name: '!commit', value: 'Send all tracked changes as a commit summary (admin only)', inline: false },
                { name: '!clear', value: 'Clear all tracked changes without sending (admin only)', inline: false },
                { name: '!mode auto/manual', value: 'Switch between auto-commit and manual mode (admin only)', inline: false },
                { name: '!version show', value: 'Show current version number (admin only)', inline: false },
                { name: '!version 1.2.3', value: 'Set specific version number (admin only)', inline: false },
                { name: '!version major/minor/patch [num]', value: 'Increment version (default +1) (admin only)', inline: false },
                { name: '!help', value: 'Show this help message', inline: false }
            )
            .setDescription('This bot monitors file changes and sends notifications like GitHub commits.\n\n**Auto Mode**: Changes sent automatically\n**Manual Mode**: Use `!commit` to send when ready')
            .setFooter({ text: isAdmin(message.author.id) ? 'You have admin permissions' : 'Admin commands require special permissions' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
if (!config.token) {
    console.error('❌ DISCORD_TOKEN not found in environment variables!');
    process.exit(1);
}

if (!config.channelId) {
    console.error('❌ CHANNEL_ID not found in environment variables!');
    process.exit(1);
}

client.login(config.token);

console.log('🚀 Starting File Monitor Discord Bot...');