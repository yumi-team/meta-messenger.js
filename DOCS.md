# API Documentation

> [!TIP]
> This library is written in the style of Schmavery/facebook-chat-api (without using source code) for familiarity and ease of use (and without callbacks).

* [Cookie Security](#cookie-security)
* [Client](#client)
  * [`new Client(cookies, options)`](#constructor)
  * [`client.connect()`](#connect)
  * [`client.disconnect()`](#disconnect)
  * [Properties](#properties)
* [Regular Messages](#regular-messages)
  * [`client.sendMessage()`](#sendMessage)
  * [`client.sendReaction()`](#sendReaction)
  * [`client.editMessage()`](#editMessage)
  * [`client.unsendMessage()`](#unsendMessage)
  * [`client.sendTypingIndicator()`](#sendTypingIndicator)
  * [`client.markAsRead()`](#markAsRead)
* [Media](#media)
  * [`client.sendImage()`](#sendImage)
  * [`client.sendVideo()`](#sendVideo)
  * [`client.sendVoice()`](#sendVoice)
  * [`client.sendFile()`](#sendFile)
  * [`client.sendSticker()`](#sendSticker)
  * [`client.uploadMedia()`](#uploadMedia)
* [Thread/Group Management](#threadgroup-management)
  * [`client.createThread()`](#createThread)
  * [`client.renameThread()`](#renameThread)
  * [`client.setGroupPhoto()`](#setGroupPhoto)
  * [`client.muteThread()`](#muteThread)
  * [`client.unmuteThread()`](#unmuteThread)
  * [`client.deleteThread()`](#deleteThread)
* [User Information](#user-information)
  * [`client.getUserInfo()`](#getUserInfo)
  * [`client.searchUsers()`](#searchUsers)
* [E2EE (End-to-End Encryption)](#e2ee-end-to-end-encryption)
  * [`client.connectE2EE()`](#connectE2EE)
  * [`client.sendE2EEMessage()`](#sendE2EEMessage)
  * [`client.sendE2EEReaction()`](#sendE2EEReaction)
  * [`client.sendE2EETyping()`](#sendE2EETyping)
  * [`client.editE2EEMessage()`](#editE2EEMessage)
  * [`client.unsendE2EEMessage()`](#unsendE2EEMessage)
* [E2EE Media](#e2ee-media)
  * [`client.sendE2EEImage()`](#sendE2EEImage)
  * [`client.sendE2EEVideo()`](#sendE2EEVideo)
  * [`client.sendE2EEAudio()`](#sendE2EEAudio)
  * [`client.sendE2EEDocument()`](#sendE2EEDocument)
  * [`client.sendE2EESticker()`](#sendE2EESticker)
  * [`client.downloadE2EEMedia()`](#downloadE2EEMedia)
  * [`client.getDeviceData()`](#getDeviceData)
* [Miscellaneous](#miscellaneous)
  * [`client.unloadLibrary()`](#unloadLibrary)
* [Utilities](#utilities)
  * [`Utils.parseCookies()`](#parseCookies)
  * [`Utils.validate()`](#validate)
  * [`Utils.getMissing()`](#getMissing)
* [Events](#events)
  * [`message`](#event-message) 🔵
  * [`e2eeMessage`](#event-e2eeMessage) 🟢
  * [`messageEdit`](#event-messageEdit) 🔵🟢
  * [`messageUnsend`](#event-messageUnsend) 🔵🟢
  * [`reaction`](#event-reaction) 🔵
  * [`e2eeReaction`](#event-e2eeReaction) 🟢
  * [`typing`](#event-typing) 🔵
  * [`readReceipt`](#event-readReceipt) 🔵
  * [`e2eeReceipt`](#event-e2eeReceipt) 🟢
  * [`e2eeConnected`](#event-e2eeConnected) 🟢
  * [`fullyReady`](#event-fullyReady) 🔵🟢
  * [`disconnected`](#event-disconnected) 🔵🟢
* [Types](#types)

---

## Cookie Security

**Read this section carefully** before copy+pasting the examples below.

You **should not** store cookies directly in your code. Reasons:
* Others may see your code and obtain your cookies
* Code backups may be read by others
* You cannot push code to Github without removing cookies. Note: Even if you undo the commit containing cookies, Git still stores them and they can be read
* If you change cookies in the future, you must edit all places in your code

The recommended approach is to save cookies to a separate file:

```typescript
import { readFileSync } from 'fs'
import { Utils } from 'meta-messenger.js'

const cookies = Utils.parseCookies(readFileSync('cookies.json', 'utf-8'))
```

Or use environment variables:
```typescript
const cookies = {
    c_user: process.env.FB_C_USER,
    xs: process.env.FB_XS,
    fr: process.env.FB_FR,
    datr: process.env.FB_DATR,
    // other cookies...
}
```

---

# Client

<a name="constructor"></a>
## new Client(cookies, options?)

Create a new client to connect to Messenger.

__Parameters__

* `cookies`: Object containing required cookies (`c_user`, `xs`, `datr`, `fr`, ...).
* `options` (optional): Configuration object:
  * `platform`: `'facebook'` | `'messenger'` | `'instagram'` - Platform for cookies [Library currently only tested with `'facebook'`] (default: `'facebook'`)
  * `enableE2EE`: Boolean - Enable end-to-end encryption (for Messenger) (default: `true`)
  * `devicePath`: String - Path to file for storing device data (for E2EE)
  * `deviceData`: String - Saved device data (JSON string) (takes priority)
  * `logLevel`: `'none'` | `'error'` | `'warn'` | `'info'` | `'debug'` | `'trace'` (default: `'none'`)
  * `autoReconnect`: Boolean - Auto reconnect on disconnect (default: `true`)

__Example__

```typescript
import { Client } from 'meta-messenger.js'

const cookies = {
    c_user: '100000000000000',
    xs: '48:abc123...',
    datr: 'xyz789...',
    fr: '1QO0u...'
}

const client = new Client(cookies)
```

---

<a name="connect"></a>
## client.connect()

Connect to Messenger. Returns a Promise with user info and initial data.

__Returns__

Promise<{ user: User, initialData: InitialData }>

* `user`: Logged-in user information
  * `id`: number - Facebook ID
  * `name`: string - Display name
  * `username`: string - Username
* `initialData`: Initial data
  * `threads`: Thread[] - List of recent threads
  * `messages`: Message[] - Recent messages

__Example__

```typescript
const { user, initialData } = await client.connect()
console.log(`Logged in: ${user.name} (${user.id})`)
console.log(`Thread count: ${initialData.threads.length}`)
```

---

<a name="disconnect"></a>
## client.disconnect()

Disconnect from Messenger.

__Example__

```typescript
await client.disconnect()
console.log('Disconnected')
```

---

<a name="properties"></a>
## Properties

<a name="user"></a>
### client.user

Logged-in user information. `null` if not connected.

__Type:__ `User | null`

---

<a name="currentUserId"></a>
### client.currentUserId

Facebook ID of the current user. `null` if not connected.

__Type:__ `number | null`

---

<a name="initialData"></a>
### client.initialData

Initial data (threads and messages). `null` if not connected.

__Type:__ `InitialData | null`

---

<a name="isConnected"></a>
### client.isConnected

Check if client is connected.

__Type:__ `boolean`

---

<a name="isE2EEConnected"></a>
### client.isE2EEConnected

Check if E2EE is connected.

__Type:__ `boolean`

---

<a name="isFullyReady"></a>
### client.isFullyReady

Check if client is fully ready (socket + E2EE if enabled).

__Type:__ `boolean`

---

# Regular Messages

<a name="sendMessage"></a>
## client.sendMessage(threadId, options)

Send a text message to a thread.

__Parameters__

* `threadId`: number - Thread ID.
* `options`: string | SendMessageOptions
  * If string: Send a simple text message
  * If object:
    * `text`: string - Message content
    * `replyToId?`: string - Message ID to reply to
    * `mentions?`: Mention[] - List of mentions
      * `userId`: number - Mentioned user ID
      * `offset`: number - Start position in text
      * `length`: number - Length of mention

__Returns__

Promise<SendMessageResult>
* `messageId`: string - Sent message ID
* `timestampMs`: number - Timestamp (milliseconds)

__Example__

```typescript
// Simple message
await client.sendMessage(threadId, 'Hello!')

// Message with reply
await client.sendMessage(threadId, {
    text: 'This is a reply',
    replyToId: 'mid.$abc123'
})

// Message with mention
await client.sendMessage(threadId, {
    text: 'Hello @friend!',
    mentions: [{
        userId: 100000000000001,
        offset: 6,
        length: 7
    }]
})
```

---

<a name="sendReaction"></a>
## client.sendReaction(threadId, messageId, emoji?)

Send or remove a reaction on a message.

__Parameters__

* `threadId`: number - Thread ID
* `messageId`: string - Message ID to react to
* `emoji?`: string - Reaction emoji (omit to remove reaction)

__Example__

```typescript
// Add reaction
await client.sendReaction(threadId, messageId, '👍')

// Remove reaction
await client.sendReaction(threadId, messageId)
```

---

<a name="editMessage"></a>
## client.editMessage(messageId, newText)

Edit a sent message.

__Parameters__

* `messageId`: string - Message ID to edit
* `newText`: string - New content

__Example__

```typescript
await client.editMessage('mid.$abc123', 'Edited content')
```

---

<a name="unsendMessage"></a>
## client.unsendMessage(messageId)

Unsend (delete) a sent message.

__Parameters__

* `messageId`: string - Message ID to unsend

__Example__

```typescript
await client.unsendMessage('mid.$abc123')
```

---

<a name="sendTypingIndicator"></a>
## client.sendTypingIndicator(threadId, isTyping?, isGroup?)

Send typing indicator.

__Parameters__

* `threadId`: number - Thread ID
* `isTyping?`: boolean - `true` to start, `false` to stop (default: `true`)
* `isGroup?`: boolean - `true` if group chat (default: `false`)

__Example__

```typescript
// Start typing
await client.sendTypingIndicator(threadId, true)

// Stop typing after 2 seconds
setTimeout(async () => {
    await client.sendTypingIndicator(threadId, false)
}, 2000)
```

---

<a name="markAsRead"></a>
## client.markAsRead(threadId, watermarkTs?)

Mark a thread as read.

__Parameters__

* `threadId`: number - Thread ID
* `watermarkTs?`: number - Watermark timestamp (default: current time)

__Example__

```typescript
await client.markAsRead(threadId)
```

---

# Media

<a name="sendImage"></a>
## client.sendImage(threadId, data, filename, caption?)

Send an image.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer - Image data
* `filename`: string - Filename
* `caption?`: string - Caption (optional)

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
import { readFileSync } from 'fs'

const image = readFileSync('photo.jpg')
await client.sendImage(threadId, image, 'photo.jpg', 'Nice photo!')
```

---

<a name="sendVideo"></a>
## client.sendVideo(threadId, data, filename, caption?)

Send a video.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer - Video data
* `filename`: string - Filename
* `caption?`: string - Caption (optional)

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
const video = readFileSync('video.mp4')
await client.sendVideo(threadId, video, 'video.mp4', 'Cool video!')
```

---

<a name="sendVoice"></a>
## client.sendVoice(threadId, data, filename)

Send a voice message.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer - Audio data
* `filename`: string - Filename

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
const voice = readFileSync('voice.mp3')
await client.sendVoice(threadId, voice, 'voice.mp3')
```

---

<a name="sendFile"></a>
## client.sendFile(threadId, data, filename, mimeType, caption?)

Send any file.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer - File data
* `filename`: string - Filename
* `mimeType`: string - MIME type (e.g., 'application/pdf')
* `caption?`: string - Caption (optional)

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
const pdf = readFileSync('document.pdf')
await client.sendFile(threadId, pdf, 'document.pdf', 'application/pdf', 'Document')
```

---

<a name="sendSticker"></a>
## client.sendSticker(threadId, stickerId)

Send a sticker.

__Parameters__

* `threadId`: number - Thread ID
* `stickerId`: number - Sticker ID

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
// Send thumbs up sticker
await client.sendSticker(threadId, 369239263222822)
```

---

<a name="uploadMedia"></a>
## client.uploadMedia(threadId, data, filename, mimeType)

Upload media and get ID for later use.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer - File data
* `filename`: string - Filename
* `mimeType`: string - MIME type

__Returns__

Promise<UploadMediaResult>
* `fbId`: number - Facebook ID of media
* `filename`: string - Filename

__Example__

```typescript
const image = readFileSync('photo.jpg')
const result = await client.uploadMedia(threadId, image, 'photo.jpg', 'image/jpeg')
console.log(`Uploaded: ${result.fbId}`)
```

---

# Thread/Group Management

<a name="createThread"></a>
## client.createThread(userId)

Create a 1:1 thread with a user.

__Parameters__

* `userId`: number - User ID

__Returns__

Promise<CreateThreadResult>
* `threadId`: number - New thread ID

__Example__

```typescript
const { threadId } = await client.createThread(100000000000001)
await client.sendMessage(threadId, 'Hello!')
```

---

<a name="renameThread"></a>
## client.renameThread(threadId, newName)

Rename a group chat.

__Parameters__

* `threadId`: number - Thread ID
* `newName`: string - New name

__Example__

```typescript
await client.renameThread(threadId, 'Best Friends')
```

---

<a name="setGroupPhoto"></a>
## client.setGroupPhoto(threadId, data, mimeType?)

Change the group avatar.

__Parameters__

* `threadId`: number - Thread ID
* `data`: Buffer | string - Image data (Buffer or base64 string)
* `mimeType?`: string - MIME type (default: 'image/jpeg')

__Note__

Messenger web does not support removing group photo, only changing.

__Example__

```typescript
const photo = readFileSync('group-photo.jpg')
await client.setGroupPhoto(threadId, photo, 'image/jpeg')
```

---

<a name="muteThread"></a>
## client.muteThread(threadId, seconds?)

Mute thread notifications.

__Parameters__

* `threadId`: number - Thread ID
* `seconds?`: number - Mute duration (seconds)
  * `-1`: Mute forever (default)
  * `0`: Unmute
  * `> 0`: Mute for the specified duration

__Example__

```typescript
// Mute forever
await client.muteThread(threadId)

// Mute for 1 hour
await client.muteThread(threadId, 3600)
```

---

<a name="unmuteThread"></a>
## client.unmuteThread(threadId)

Unmute thread notifications.

__Parameters__

* `threadId`: number - Thread ID

__Example__

```typescript
await client.unmuteThread(threadId)
```

---

<a name="deleteThread"></a>
## client.deleteThread(threadId)

Delete a thread.

__Parameters__

* `threadId`: number - Thread ID

__Warning__

This action cannot be undone!

__Example__

```typescript
await client.deleteThread(threadId)
```

---

# User Information

<a name="getUserInfo"></a>
## client.getUserInfo(userId)

Get detailed information about a user.

__Parameters__

* `userId`: number - User ID

__Returns__

Promise<UserInfo>
* `id`: number - Facebook ID
* `name`: string - Full name
* `firstName?`: string - First name
* `username?`: string - Username
* `profilePictureUrl?`: string - Profile picture URL
* `isMessengerUser?`: boolean - Uses Messenger
* `isVerified?`: boolean - Verified account
* `gender?`: number - Gender
* `canViewerMessage?`: boolean - Can message

__Example__

```typescript
const user = await client.getUserInfo(100000000000001)
console.log(`${user.name} (@${user.username})`)
```

---

<a name="searchUsers"></a>
## client.searchUsers(query)

Search users by name or username.

__Parameters__

* `query`: string - Search keyword

__Returns__

Promise<SearchUserResult[]>
* `id`: number - Facebook ID
* `name`: string - Name
* `username`: string - Username

__Example__

```typescript
const users = await client.searchUsers('John Doe')
for (const user of users) {
    console.log(`${user.name} (${user.id})`)
}
```

---

# E2EE (End-to-End Encryption)

<a name="connectE2EE"></a>
## client.connectE2EE()

Connect E2EE. Usually called automatically if `enableE2EE: true`.

__Note__

This Promise resolves when the function completes, not when E2EE is fully connected. Listen for the `e2eeConnected` or `fullyReady` event.

__Example__

```typescript
await client.connectE2EE()
// Wait for e2eeConnected event
```

---

<a name="sendE2EEMessage"></a>
## client.sendE2EEMessage(chatJid, text, options?)

Send an E2EE message.

__Parameters__

* `chatJid`: string - Chat JID (format: `user_id@msgr.fb`)
* `text`: string - Message content
* `options?`: object
  * `replyToId?`: string - Message ID to reply to
  * `replyToSenderJid?`: string - JID of the reply message sender

__Returns__

Promise<SendMessageResult>

__Example__

```typescript
await client.sendE2EEMessage('100000000000001@msgr.fb', 'Hello!')

// Reply
await client.sendE2EEMessage('100000000000001@msgr.fb', 'This is a reply', {
    replyToId: 'msgid123',
    replyToSenderJid: '100000000000002@msgr.fb'
})
```

---

<a name="sendE2EEReaction"></a>
## client.sendE2EEReaction(chatJid, messageId, senderJid, emoji?)

Send/remove E2EE reaction.

__Parameters__

* `chatJid`: string - Chat JID
* `messageId`: string - Message ID
* `senderJid`: string - JID of the original message sender
* `emoji?`: string - Emoji (omit to remove)

__Example__

```typescript
await client.sendE2EEReaction(chatJid, messageId, senderJid, '❤️')
```

---

<a name="sendE2EETyping"></a>
## client.sendE2EETyping(chatJid, isTyping?)

Send typing indicator in an E2EE chat.

__Parameters__

* `chatJid`: string - Chat JID
* `isTyping?`: boolean - Whether typing (default: true)

__Example__

```typescript
// Start typing
await client.sendE2EETyping(chatJid, true)

// Stop typing
await client.sendE2EETyping(chatJid, false)
```

---

<a name="editE2EEMessage"></a>
## client.editE2EEMessage(chatJid, messageId, newText)

Edit an E2EE message.

__Parameters__

* `chatJid`: string - Chat JID
* `messageId`: string - Message ID
* `newText`: string - New content

__Example__

```typescript
await client.editE2EEMessage(chatJid, messageId, 'Edited content')
```

---

<a name="unsendE2EEMessage"></a>
## client.unsendE2EEMessage(chatJid, messageId)

Unsend an E2EE message.

__Parameters__

* `chatJid`: string - Chat JID
* `messageId`: string - Message ID

__Example__

```typescript
await client.unsendE2EEMessage(chatJid, messageId)
```

---

# E2EE Media

<a name="sendE2EEImage"></a>
## client.sendE2EEImage(chatJid, data, mimeType?, options?)

Send an E2EE image.

__Parameters__

* `chatJid`: string - Chat JID
* `data`: Buffer - Image data
* `mimeType?`: string - MIME type (default: 'image/jpeg')
* `options?`: object
  * `caption?`: string - Caption
  * `width?`: number - Width
  * `height?`: number - Height
  * `replyToId?`: string - Reply message ID
  * `replyToSenderJid?`: string - Sender JID

__Example__

```typescript
const image = readFileSync('photo.jpg')
await client.sendE2EEImage(chatJid, image, 'image/jpeg', {
    caption: 'Nice photo!'
})
```

---

<a name="sendE2EEVideo"></a>
## client.sendE2EEVideo(chatJid, data, mimeType?, options?)

Send an E2EE video.

__Parameters__

* `chatJid`: string - Chat JID
* `data`: Buffer - Video data
* `mimeType?`: string - MIME type (default: 'video/mp4')
* `options?`: object
  * `caption?`: string - Caption
  * `width?`: number - Width
  * `height?`: number - Height
  * `duration?`: number - Duration (seconds)
  * `replyToId?`: string - Reply message ID
  * `replyToSenderJid?`: string - Sender JID

__Example__

```typescript
const video = readFileSync('video.mp4')
await client.sendE2EEVideo(chatJid, video, 'video/mp4', {
    caption: 'Cool video!',
    duration: 30
})
```

---

<a name="sendE2EEAudio"></a>
## client.sendE2EEAudio(chatJid, data, mimeType?, options?)

Send E2EE audio/voice.

__Parameters__

* `chatJid`: string - Chat JID
* `data`: Buffer - Audio data
* `mimeType?`: string - MIME type (default: 'audio/ogg')
* `options?`: object
  * `ptt?`: boolean - Push-to-talk/voice message (default: false)
  * `duration?`: number - Duration (seconds)
  * `replyToId?`: string - Reply message ID
  * `replyToSenderJid?`: string - Sender JID

__Example__

```typescript
const voice = readFileSync('voice.ogg')
await client.sendE2EEAudio(chatJid, voice, 'audio/ogg', {
    ptt: true,
    duration: 10
})
```

---

<a name="sendE2EEDocument"></a>
## client.sendE2EEDocument(chatJid, data, filename, mimeType, options?)

Send E2EE file/document.

__Parameters__

* `chatJid`: string - Chat JID
* `data`: Buffer - File data
* `filename`: string - Filename
* `mimeType`: string - MIME type
* `options?`: object
  * `replyToId?`: string - Reply message ID
  * `replyToSenderJid?`: string - Sender JID

__Example__

```typescript
const pdf = readFileSync('document.pdf')
await client.sendE2EEDocument(chatJid, pdf, 'document.pdf', 'application/pdf')
```

---

<a name="sendE2EESticker"></a>
## client.sendE2EESticker(chatJid, data, mimeType?, options?)

Send E2EE sticker.

__Parameters__

* `chatJid`: string - Chat JID
* `data`: Buffer - Sticker data (WebP format)
* `mimeType?`: string - MIME type (default: 'image/webp')
* `options?`: object
  * `replyToId?`: string - Reply message ID
  * `replyToSenderJid?`: string - Sender JID

__Example__

```typescript
const sticker = readFileSync('sticker.webp')
await client.sendE2EESticker(chatJid, sticker, 'image/webp')
```

---

<a name="downloadE2EEMedia"></a>
## client.downloadE2EEMedia(options)

Download and decrypt E2EE media from an attachment.

__Parameters__

* `options`: object
  * `directPath`: string - Direct path from attachment
  * `mediaKey`: string - Base64 encoded media key
  * `mediaSha256`: string - Base64 encoded file SHA256
  * `mediaEncSha256?`: string - Base64 encoded encrypted file SHA256 (recommended for verification)
  * `mediaType`: string - Media type: `'image'`, `'video'`, `'audio'`, `'document'`, `'sticker'`
  * `mimeType`: string - MIME type (e.g., 'image/jpeg')
  * `fileSize`: number - File size in bytes

__Returns__

Promise<{ data: Buffer; mimeType: string; fileSize: number }>
* `data`: Buffer - Decrypted media data
* `mimeType`: string - MIME type
* `fileSize`: number - File size

__Example__

```typescript
import { writeFileSync } from 'fs'

client.on('e2eeMessage', async (message) => {
    if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0]
        
        // Check if attachment has required E2EE metadata
        if (attachment.mediaKey && attachment.mediaSha256 && attachment.directPath) {
            try {
                const result = await client.downloadE2EEMedia({
                    directPath: attachment.directPath,
                    mediaKey: attachment.mediaKey,
                    mediaSha256: attachment.mediaSha256,
                    mediaEncSha256: attachment.mediaEncSha256, // Optional but recommended
                    mediaType: attachment.type,
                    mimeType: attachment.mimeType || 'application/octet-stream',
                    fileSize: attachment.fileSize || 0,
                })
                
                // Save to file
                const extension = result.mimeType.split('/')[1] || 'bin'
                writeFileSync(`downloaded.${extension}`, result.data)
                console.log(`Downloaded ${result.fileSize} bytes`)
            } catch (error) {
                console.error('Failed to download E2EE media:', error)
            }
        }
    }
})
```

__Note__

This method only works for E2EE (end-to-end encrypted) messages. For regular messages, use the `url` field in the attachment instead.

---

<a name="getDeviceData"></a>
## client.getDeviceData()

Get the current E2EE device data as JSON string.

This returns the current in-memory E2EE device state, which includes:
- Noise key pair (for encrypted communication)
- Identity key pair (for identity verification)
- Signed pre-key (for session establishment)
- Registration ID
- All sessions and identities established with other users

__Returns__

string - Device data as JSON string

__Works with all device store modes__

| Mode | Description |
|------|-------------|
| `e2eeMemoryOnly: true` | Get the ephemeral device data before it's lost on disconnect |
| `deviceData: "..."` | Get the updated state after sessions/keys change |
| `devicePath: "..."` | Get current state (also auto-saved to file) |

__Use cases__

- Save device data to database instead of file
- Backup device state periodically
- Transfer device state between instances
- Export state from memory-only mode before disconnect

__Example__

```typescript
import { writeFileSync } from 'fs'

// Save device data to file
const deviceData = client.getDeviceData()
writeFileSync('device.json', deviceData)

// Or save to database
await db.saveDeviceData(userId, deviceData)

// Load on startup
const client = new Client(cookies, {
    deviceData: readFileSync('device.json', 'utf-8')
    // or: deviceData: await db.getDeviceData(userId)
})
```

---

# Miscellaneous

<a name="unloadLibrary"></a>
## client.unloadLibrary()

Unload the native library from memory.

__Warning__

After calling this method, any operation with the client will crash. Only use when you need to fully cleanup before shutting down the application.

__Example__

```typescript
await client.disconnect()
client.unloadLibrary()
// Do not use client after this!
```

---

# Utilities

<a name="parseCookies"></a>
## Utils.parseCookies(input)

Parse cookies from various formats.

__Parameters__

* `input`: string - Cookies in the form of:
  * JSON array: `[{ "name": "c_user", "value": "..." }, ...]`
  * JSON object: `{ "c_user": "...", "xs": "..." }`
  * Cookie string: `"c_user=...; xs=..."`
  * Netscape format
  * Base64 encoded (any format above)

__Returns__

Cookies - Object with key-value pairs

__Example__

```typescript
import { Utils } from 'meta-messenger.js'
import { readFileSync } from 'fs'

const cookies = Utils.parseCookies(readFileSync('cookies.json', 'utf-8'))
```

---

<a name="validate"></a>
## Utils.validate(cookies)

Check if cookies have all required fields.

__Parameters__

* `cookies`: Cookies - Cookies object

__Returns__

boolean - `true` if valid

__Example__

```typescript
if (!Utils.validate(cookies)) {
    console.error('Invalid cookies!')
}
```

---

<a name="getMissing"></a>
## Utils.getMissing(cookies)

Get list of missing required cookies.

__Parameters__

* `cookies`: Cookies - Cookies object

__Returns__

string[] - List of missing cookie names

__Example__

```typescript
const missing = Utils.getMissing(cookies)
if (missing.length > 0) {
    console.error(`Missing cookies: ${missing.join(', ')}`)
}
```

---

# Events

> **Legend:**
> - 🔵 **Regular** = Regular messages (unencrypted)
> - 🟢 **E2EE** = End-to-end encrypted messages

| Event | Regular | E2EE | Description |
|-------|:-------:|:----:|-------------|
| `ready` | 🔵 | ❌ | Socket connection successful |
| `reconnected` | 🔵 | ❌ | Reconnection successful |
| `message` | 🔵 | ❌ | New regular message |
| `e2eeMessage` | ❌ | 🟢 | New E2EE message |
| `messageEdit` | 🔵 | 🟢 | Message edited |
| `messageUnsend` | 🔵 | 🟢 | Message unsent |
| `reaction` | 🔵 | ❌ | Regular message reaction |
| `e2eeReaction` | ❌ | 🟢 | E2EE message reaction |
| `typing` | 🔵 | ❌ | Typing indicator (regular) |
| `readReceipt` | 🔵 | ❌ | Message read (regular) |
| `e2eeReceipt` | ❌ | 🟢 | Message read (E2EE) |
| `e2eeConnected` | ❌ | 🟢 | E2EE connection successful |
| `deviceDataChanged` | ❌ | 🟢 | Device data changed |
| `fullyReady` | 🔵 | 🟢 | Client fully ready |
| `disconnected` | 🔵 | 🟢 | Disconnected |
| `error` | 🔵 | 🟢 | Error occurred |

---

<a name="event-ready"></a>
## Event: 'ready'

> 🔵 **Socket connection**

Emitted when socket connection is successful (before E2EE).

```typescript
client.on('ready', (data) => {
    console.log('Socket connected!')
    if (data.isNewSession) {
        console.log('This is a new session')
    }
})
```

__Data object__

* `isNewSession`: boolean - `true` if new connection session

---

<a name="event-reconnected"></a>
## Event: 'reconnected'

> 🔵 **Socket reconnection**

Emitted when socket reconnection is successful after disconnection.

```typescript
client.on('reconnected', () => {
    console.log('Reconnected to Messenger!')
})
```

---

<a name="event-message"></a>
## Event: 'message'

> 🔵 **Regular messages only**

Emitted when a new regular message is received.

```typescript
client.on('message', (message: Message) => {
    console.log(`${message.senderId}: ${message.text}`)
})
```

__Message object__

* `id`: string - Message ID
* `threadId`: number - Thread ID
* `senderId`: number - Sender ID
* `text`: string - Content
* `timestampMs`: number - Timestamp
* `attachments?`: Attachment[] - Attachments
* `replyTo?`: ReplyTo - Reply info
* `mentions?`: Mention[] - Mentions
* `isAdminMsg?`: boolean - System message

---

<a name="event-messageEdit"></a>
## Event: 'messageEdit'

> 🔵🟢 **Supports both regular and E2EE messages**

Emitted when a message is edited (both regular and E2EE).

```typescript
client.on('messageEdit', (data) => {
    console.log(`Message ${data.messageId} edited to: ${data.newText}`)
})
```

__Data object__

* `messageId`: string - Message ID
* `newText`: string - New content
* `editCount?`: number - Edit count
* `timestampMs`: number - Edit timestamp

---

<a name="event-messageUnsend"></a>
## Event: 'messageUnsend'

> 🔵🟢 **Supports both regular and E2EE messages**

Emitted when a message is unsent (both regular and E2EE).

```typescript
client.on('messageUnsend', (data) => {
    console.log(`Message ${data.messageId} unsent in thread ${data.threadId}`)
})
```

__Data object__

* `messageId`: string - Message ID
* `threadId`: number - Thread ID

---

<a name="event-reaction"></a>
## Event: 'reaction'

> 🔵 **Regular messages only** - See [`e2eeReaction`](#event-e2eeReaction) for E2EE

Emitted when a new reaction is added to a regular message.

```typescript
client.on('reaction', (data) => {
    console.log(`${data.actorId} reacted ${data.reaction} to ${data.messageId}`)
})
```

__Data object__

* `messageId`: string - Message ID
* `threadId`: number - Thread ID
* `actorId`: number - Reactor ID
* `reaction`: string - Emoji (empty = removed reaction)

---

<a name="event-typing"></a>
## Event: 'typing'

> 🔵 **Regular messages only**

Emitted when someone is typing in a regular thread.

```typescript
client.on('typing', (data) => {
    console.log(`${data.senderId} is ${data.isTyping ? 'typing' : 'stopped typing'}`)
})
```

__Data object__

* `threadId`: number - Thread ID
* `senderId`: number - Typer ID
* `isTyping`: boolean - Typing or stopped

---

<a name="event-readReceipt"></a>
## Event: 'readReceipt'

> 🔵 **Regular messages only** - See [`e2eeReceipt`](#event-e2eeReceipt) for E2EE

Emitted when a regular message is read.

```typescript
client.on('readReceipt', (data) => {
    console.log(`${data.readerId} read messages in ${data.threadId}`)
})
```

__Data object__

* `threadId`: number - Thread ID
* `readerId`: number - Reader ID
* `readWatermarkTimestampMs`: number - Read watermark timestamp
* `timestampMs?`: number - Read time

---

<a name="event-e2eeMessage"></a>
## Event: 'e2eeMessage'

> 🟢 **E2EE messages only** - See [`message`](#event-message) for regular messages

Emitted when a new E2EE message is received.

```typescript
client.on('e2eeMessage', (message: E2EEMessage) => {
    console.log(`[E2EE] ${message.senderJid}: ${message.text}`)
})
```

__E2EEMessage object__

* `id`: string - Message ID
* `threadId`: number - Thread ID
* `chatJid`: string - Chat JID
* `senderJid`: string - Sender JID
* `senderId`: number - Sender ID
* `text`: string - Content
* `timestampMs`: number - Timestamp
* `attachments?`: Attachment[]
* `replyTo?`: ReplyTo
* `mentions?`: Mention[]

---

<a name="event-e2eeReaction"></a>
## Event: 'e2eeReaction'

> 🟢 **E2EE messages only** - See [`reaction`](#event-reaction) for regular messages

Emitted when a reaction is added to an E2EE message.

```typescript
client.on('e2eeReaction', (data) => {
    console.log(`${data.senderJid} reacted ${data.reaction}`)
})
```

__Data object__

* `messageId`: string - Message ID
* `chatJid`: string - Chat JID
* `senderJid`: string - Reactor JID
* `senderId`: number - Reactor ID
* `reaction`: string - Emoji (empty = removed reaction)

---

<a name="event-e2eeReceipt"></a>
## Event: 'e2eeReceipt'

> 🟢 **E2EE messages only** - See [`readReceipt`](#event-readReceipt) for regular messages

Emitted when there's a receipt for E2EE messages (read, delivered, etc.).

```typescript
client.on('e2eeReceipt', (data) => {
    console.log(`[E2EE] Receipt type ${data.type} for messages:`, data.messageIds)
})
```

__Data object__

* `type`: string - Receipt type (`'read'`, `'delivered'`, etc.)
* `chat`: string - Chat JID
* `sender`: string - Sender JID
* `messageIds`: string[] - List of message IDs

---

<a name="event-e2eeConnected"></a>
## Event: 'e2eeConnected'

> 🟢 **E2EE only**

Emitted when E2EE connection is successful.

```typescript
client.on('e2eeConnected', () => {
    console.log('E2EE connected!')
})
```

---

<a name="event-fullyReady"></a>
## Event: 'fullyReady'

> 🔵🟢 **Supports both regular and E2EE**

Emitted when client is fully ready (socket + E2EE if enabled).

```typescript
client.on('fullyReady', () => {
    console.log('Client is ready!')
})
```

__Note__

Message events (message/e2eeMessage) will be queued until `fullyReady` is emitted.

---

<a name="event-disconnected"></a>
## Event: 'disconnected'

> 🔵🟢 **Supports both regular and E2EE**

Emitted when disconnected.

```typescript
client.on('disconnected', (data) => {
    if (data?.isE2EE) {
        console.log('E2EE disconnected')
    } else {
        console.log('Socket disconnected')
    }
})
```

__Data object__

* `isE2EE?`: boolean - `true` if E2EE disconnected

---

<a name="event-error"></a>
## Event: 'error'

> 🔵🟢 **Supports both regular and E2EE**

Emitted when an error occurs.

```typescript
client.on('error', (error) => {
    console.error(`Error: ${error.message}`)
})
```

__Parameter__

* `error`: Error - Standard JavaScript Error object

---

<a name="event-deviceDataChanged"></a>
## Event: 'deviceDataChanged'

> 🟢 **E2EE only** - Only when using `deviceData` option

Emitted when E2EE device data changes. Use to save device data to database.

```typescript
client.on('deviceDataChanged', (data) => {
    // Save device data to database
    await saveToDatabase(data.deviceData)
})
```

__Data object__

* `deviceData`: string - Device data as JSON string

__Note__

This event is only emitted when you initialize the client with the `deviceData` option. If using `e2eeDeviceDataPath`, device data will be automatically saved to file.

---

# Types

## Cookies

```typescript
interface Cookies {
    c_user: string
    xs: string
    datr: string
    [key: string]: string
}
```

## Message

```typescript
interface Message {
    id: string
    threadId: number
    senderId: number
    text: string
    timestampMs: number
    isE2EE?: boolean
    chatJid?: string
    senderJid?: string
    attachments?: Attachment[]
    replyTo?: ReplyTo
    mentions?: Mention[]
    isAdminMsg?: boolean
}
```

## Attachment

```typescript
interface Attachment {
    type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif' | 'voice' | 'link'
    url?: string
    fileName?: string
    mimeType?: string
    fileSize?: number
    width?: number
    height?: number
    duration?: number
    stickerId?: number
    previewUrl?: string
    // For link attachments
    description?: string    // Link description/subtitle
    sourceText?: string     // Source domain text
    // For E2EE media download (only available in E2EE messages)
    mediaKey?: string      // Base64 encoded encryption key
    mediaSha256?: string   // Base64 encoded file SHA256
    mediaEncSha256?: string // Base64 encoded encrypted file SHA256
    directPath?: string    // Direct path for download
}
```

## ReplyTo

```typescript
interface ReplyTo {
    messageId: string
    senderId?: number
    text?: string
}
```

## Mention

```typescript
interface Mention {
    userId: number
    offset: number
    length: number
}
```

## Thread

```typescript
interface Thread {
    id: number
    type: number
    name: string
    lastActivityTimestampMs: number
    isGroup?: boolean
    participants?: number[]
}
```

## User

```typescript
interface User {
    id: number
    name: string
    username: string
}
```

## UserInfo

```typescript
interface UserInfo {
    id: number
    name: string
    firstName?: string
    username?: string
    profilePictureUrl?: string
    isMessengerUser?: boolean
    isVerified?: boolean
    gender?: number
    canViewerMessage?: boolean
}
```
