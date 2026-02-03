/*
 * meta-messenger.js, Unofficial Meta Messenger Chat API for NodeJS
 * Copyright (c) 2026 Elysia and contributors
 */

import { EventEmitter } from "node:events";

import { native } from "./native.js";
import type {
    ClientEvent,
    ClientOptions,
    Cookies,
    CreateThreadResult,
    E2EEMessage,
    InitialData,
    Message,
    SearchUserResult,
    SendMessageOptions,
    SendMessageResult,
    UploadMediaResult,
    User,
    UserInfo,
} from "./types.js";

declare class TypedEventEmitter<T> {
    on<K extends keyof T>(event: K, listener: (...args: T[K] extends unknown[] ? T[K] : never) => void): this;
    once<K extends keyof T>(event: K, listener: (...args: T[K] extends unknown[] ? T[K] : never) => void): this;
    off<K extends keyof T>(event: K, listener: (...args: T[K] extends unknown[] ? T[K] : never) => void): this;
    emit<K extends keyof T>(event: K, ...args: T[K] extends unknown[] ? T[K] : never): boolean;
    removeAllListeners<K extends keyof T>(event?: K): this;
}

export interface ClientEventMap {
    ready: [{ isNewSession: boolean }];
    fullyReady: [];
    reconnected: [];
    disconnected: [{ isE2EE?: boolean }];
    error: [Error];
    message: [Message];
    messageEdit: [{ messageId: string; threadId: number; newText: string; editCount?: number; timestampMs?: number }];
    messageUnsend: [{ messageId: string; threadId: number }];
    reaction: [{ messageId: string; threadId: number; actorId: number; reaction: string; timestampMs?: number }];
    typing: [{ threadId: number; senderId: number; isTyping: boolean }];
    readReceipt: [{ threadId: number; readerId: number; readWatermarkTimestampMs: number; timestampMs?: number }];
    e2eeConnected: [];
    e2eeMessage: [E2EEMessage];
    e2eeReaction: [{ messageId: string; chatJid: string; senderJid: string; senderId?: number; reaction: string }];
    e2eeReceipt: [{ type: string; chat: string; sender: string; messageIds: string[] }];
    deviceDataChanged: [{ deviceData: string }];
}

/**
 * Demonstrates how to use the Client class to connect to Messenger and handle messages (E2EE disabled for simplicity).
 *
 * @example
 * ```typescript
 * import { Client } from 'meta-messenger.js'
 *
 * const client = new Client({
 *     c_user: 'your_user_id',
 *     xs: 'your_xs_cookie',
 *     datr: 'your_datr_cookie',
 *     fr: 'your_fr_cookie'
 * })
 *
 * client.on('message', (message) => {
 *     console.log('New message:', message)
 *     if (message.text === 'ping') {
 *         client.sendMessage(message.threadId, { text: 'pong' })
 *     }
 * })
 *
 * await client.connect()
 * ```
 */
export class Client extends (EventEmitter as new () => TypedEventEmitter<ClientEventMap>) {
    private handle: number | null = null;
    private options: ClientOptions;
    private cookies: Cookies;
    private _user: User | null = null;
    private _initialData: InitialData | null = null;
    private eventLoopRunning = false;
    private eventLoopAbort: AbortController | null = null;
    private _socketReady = false;
    private _e2eeConnected = false;
    private _fullyReadyEmitted = false;
    private pendingEvents: ClientEvent[] = [];

    /**
     * Create a new Messenger client
     *
     * @param cookies - Authentication cookies
     * @param options - Client options
     */
    constructor(cookies: Cookies, options: ClientOptions = {}) {
        super();
        this.cookies = cookies;
        this.options = {
            // ! todo: detect platform automatically
            platform: "facebook",
            logLevel: "none",
            enableE2EE: true,
            autoReconnect: true,
            ...options,
        };
    }

    /**
     * Get the current user info
     */
    get user(): User | null {
        return this._user;
    }

    /**
     * Get the current user's Facebook ID
     */
    get currentUserId(): number | null {
        return this._user?.id ?? null;
    }

    /**
     * Get initial sync data (threads and messages)
     */
    get initialData(): InitialData | null {
        return this._initialData;
    }

    /**
     * Check if client is fully ready (socket ready + E2EE connected if enabled)
     */
    get isFullyReady(): boolean {
        if (!this._socketReady) return false;
        if (this.options.enableE2EE && !this._e2eeConnected) return false;
        return true;
    }

    /**
     * Check if client is connected
     */
    get isConnected(): boolean {
        if (!this.handle) return false;
        try {
            const status = native.isConnected(this.handle);
            return status.connected;
        } catch {
            return false;
        }
    }

    /**
     * Check if E2EE is connected
     */
    get isE2EEConnected(): boolean {
        if (!this.handle) return false;
        try {
            const status = native.isConnected(this.handle);
            return status.e2eeConnected;
        } catch {
            return false;
        }
    }

    /**
     * Connect to Messenger
     *
     * @returns User info and initial data
     */
    async connect(): Promise<{ user: User; initialData: InitialData }> {
        // Create native client
        const { handle } = native.newClient({
            cookies: this.cookies as Record<string, string>,
            platform: this.options.platform,
            devicePath: this.options.devicePath,
            deviceData: this.options.deviceData,
            logLevel: this.options.logLevel,
        });
        this.handle = handle;

        // Connect
        const result = native.connect(handle);
        this._user = result.user as User;
        this._initialData = result.initialData as InitialData;

        // Start event loop
        this.startEventLoop();

        // Connect E2EE if enabled
        if (this.options.enableE2EE) {
            this.connectE2EE().catch(err => {
                this.emit("error", err);
            });
        }

        return {
            user: this._user,
            initialData: this._initialData,
        };
    }

    /**
     * Connect E2EE (end-to-end encryption)
     * @warn This Promise is not resolved after the connection setup is completed; instead, it is resolved after the function finishes executing.\
     * You should not rely on this Promise to wait for the E2EE connection to be fully established.
     */
    async connectE2EE(): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.connectE2EE(this.handle);
    }

    /**
     * Disconnect from Messenger
     */
    async disconnect(): Promise<void> {
        this.stopEventLoop();
        if (this.handle) {
            native.disconnect(this.handle);
            this.handle = null;
        }
    }

    /**
     * Send a text message
     *
     * @param threadId - Thread ID to send to
     * @param options - Message options (text, reply, mentions)
     * @returns Send result with message ID
     */
    async sendMessage(threadId: number, options: SendMessageOptions | string): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");

        const opts = typeof options === "string" ? { text: options } : options;

        return native.sendMessage(this.handle, {
            threadId,
            text: opts.text,
            replyToId: opts.replyToId,
            mentionIds: opts.mentions?.map(m => m.userId),
            mentionOffsets: opts.mentions?.map(m => m.offset),
            mentionLengths: opts.mentions?.map(m => m.length),
        });
    }

    /**
     * Send / Remove a reaction to a message
     *
     * @param threadId - Thread ID
     * @param messageId - Message ID to react to
     * @param emoji - Reaction emoji (to remove, simply omit this parameter)
     */
    async sendReaction(threadId: number, messageId: string, emoji?: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.sendReaction(this.handle, threadId, messageId, emoji || "");
    }

    /**
     * Edit a message
     *
     * @param messageId - Message ID to edit
     * @param newText - New text content
     */
    async editMessage(messageId: string, newText: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.editMessage(this.handle, messageId, newText);
    }

    /**
     * Unsend/delete a message
     *
     * @param messageId - Message ID to unsend
     */
    async unsendMessage(messageId: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.unsendMessage(this.handle, messageId);
    }

    /**
     * Send typing indicator
     *
     * @param threadId - Thread ID
     * @param isTyping - Whether typing or not
     * @param isGroup - Whether it's a group chat
     */
    async sendTypingIndicator(threadId: number, isTyping: boolean = true, isGroup: boolean = false): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.sendTyping(this.handle, threadId, isTyping, isGroup, isGroup ? 2 : 1);
    }

    /**
     * Mark messages as read
     *
     * @param threadId - Thread ID
     * @param watermarkTs - Timestamp to mark read up to (optional)
     */
    async markAsRead(threadId: number, watermarkTs?: number): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.markRead(this.handle, threadId, watermarkTs);
    }

    /**
     * Upload media to Messenger
     *
     * @param threadId - Thread ID
     * @param data - File data as Buffer
     * @param filename - Filename
     * @param mimeType - MIME type
     * @param isVoice - Whether it's a voice message
     * @returns Upload result with Facebook ID
     */
    async uploadMedia(
        threadId: number,
        data: Buffer,
        filename: string,
        mimeType: string,
        isVoice: boolean = false,
    ): Promise<UploadMediaResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.uploadMedia(this.handle, {
            threadId,
            filename,
            mimeType,
            data: Array.from(data),
            isVoice,
        });
    }

    /**
     * Send an image
     *
     * @param threadId - Thread ID
     * @param data - Image data as Buffer
     * @param filename - Filename
     * @param caption - Optional caption
     */
    async sendImage(threadId: number, data: Buffer, filename: string, caption?: string): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendImage(this.handle, {
            threadId,
            data: Array.from(data),
            filename,
            caption,
        });
    }

    /**
     * Send a video
     *
     * @param threadId - Thread ID
     * @param data - Video data as Buffer
     * @param filename - Filename
     * @param caption - Optional caption
     */
    async sendVideo(threadId: number, data: Buffer, filename: string, caption?: string): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendVideo(this.handle, {
            threadId,
            data: Array.from(data),
            filename,
            caption,
        });
    }

    /**
     * Send a voice message
     *
     * @param threadId - Thread ID
     * @param data - Audio data as Buffer
     * @param filename - Filename
     */
    async sendVoice(threadId: number, data: Buffer, filename: string): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendVoice(this.handle, {
            threadId,
            data: Array.from(data),
            filename,
        });
    }

    /**
     * Send a file
     *
     * @param threadId - Thread ID
     * @param data - File data as Buffer
     * @param filename - Filename
     * @param mimeType - MIME type
     * @param caption - Optional caption
     */
    async sendFile(
        threadId: number,
        data: Buffer,
        filename: string,
        mimeType: string,
        caption?: string,
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendFile(this.handle, {
            threadId,
            data: Array.from(data),
            filename,
            mimeType,
            caption,
        });
    }

    /**
     * Send a sticker
     *
     * @param threadId - Thread ID
     * @param stickerId - Sticker ID
     */
    async sendSticker(threadId: number, stickerId: number): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendSticker(this.handle, { threadId, stickerId });
    }

    /**
     * Create a 1:1 thread with a user
     *
     * @param userId - User ID to create thread with
     * @returns Created thread info
     */
    async createThread(userId: number): Promise<CreateThreadResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.createThread(this.handle, { userId });
    }

    /**
     * Get detailed information about a user
     *
     * @param userId - User ID
     * @returns User info
     */
    async getUserInfo(userId: number): Promise<UserInfo> {
        if (!this.handle) throw new Error("Not connected");
        return native.getUserInfo(this.handle, { userId });
    }

    /**
     * Set group photo/avatar
     *
     * @param threadId - Thread ID
     * @param data - Image data as Buffer or base64 string
     * @param mimeType - MIME type (e.g., 'image/jpeg', 'image/png')
     *
     * @warn Cannot remove group photo. Messenger web doesn't have a remove option?
     */
    async setGroupPhoto(threadId: number, data: Buffer | string, mimeType: string = "image/jpeg"): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        const base64 = Buffer.isBuffer(data) ? data.toString("base64") : data;
        await native.setGroupPhoto(this.handle, threadId, base64, mimeType);
    }

    /**
     * Rename a group thread
     *
     * @param threadId - Thread ID
     * @param newName - New name
     */
    async renameThread(threadId: number, newName: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        native.renameThread(this.handle, { threadId, newName });
    }

    /**
     * Mute a thread
     *
     * @param threadId - Thread ID
     * @param muteSeconds - Duration in seconds (-1 for forever, 0 to unmute)
     */
    async muteThread(threadId: number, muteSeconds: number = -1): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        native.muteThread(this.handle, { threadId, muteSeconds });
    }

    /**
     * Unmute a thread
     *
     * @param threadId - Thread ID
     */
    async unmuteThread(threadId: number): Promise<void> {
        return this.muteThread(threadId, 0);
    }

    /**
     * Delete a thread
     *
     * @param threadId - Thread ID
     */
    async deleteThread(threadId: number): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        native.deleteThread(this.handle, { threadId });
    }

    /**
     * Search for users
     *
     * @param query - Search query
     * @returns List of matching users
     */
    async searchUsers(query: string): Promise<SearchUserResult[]> {
        if (!this.handle) throw new Error("Not connected");
        const result = await native.searchUsers(this.handle, { query });
        return result.users;
    }

    // ========== E2EE Methods ==========

    /**
     * Send an E2EE message
     *
     * @param chatJid - Chat JID
     * @param text - Message text
     * @param options - Optional: replyToId and replyToSenderJid for replies
     */
    async sendE2EEMessage(
        chatJid: string,
        text: string,
        options?: { replyToId?: string; replyToSenderJid?: string },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EEMessage(this.handle, chatJid, text, options?.replyToId, options?.replyToSenderJid);
    }

    /**
     * Send / Remove an E2EE reaction
     *
     * @param chatJid - Chat JID
     * @param messageId - Message ID
     * @param senderJid - Sender JID
     * @param emoji - Reaction emoji (To remove it, simply omit this parameter)
     */
    async sendE2EEReaction(chatJid: string, messageId: string, senderJid: string, emoji?: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.sendE2EEReaction(this.handle, chatJid, messageId, senderJid, emoji || "");
    }

    /**
     * Send E2EE typing indicator
     *
     * @param chatJid - Chat JID
     * @param isTyping - Whether typing
     */
    async sendE2EETyping(chatJid: string, isTyping: boolean = true): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.sendE2EETyping(this.handle, chatJid, isTyping);
    }

    /**
     * Edit an E2EE message
     *
     * @param chatJid - Chat JID
     * @param messageId - Message ID to edit
     * @param newText - New message text
     */
    async editE2EEMessage(chatJid: string, messageId: string, newText: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.editE2EEMessage(this.handle, chatJid, messageId, newText);
    }

    /**
     * Unsend/delete an E2EE message
     *
     * @param chatJid - Chat JID
     * @param messageId - Message ID to unsend
     */
    async unsendE2EEMessage(chatJid: string, messageId: string): Promise<void> {
        if (!this.handle) throw new Error("Not connected");
        await native.unsendE2EEMessage(this.handle, chatJid, messageId);
    }

    // ========== E2EE Media Methods ==========

    /**
     * Send an E2EE image
     *
     * @param chatJid - Chat JID
     * @param data - Image data as Buffer
     * @param mimeType - MIME type (e.g., image/jpeg, image/png)
     * @param options - Optional caption, dimensions, and reply options
     */
    async sendE2EEImage(
        chatJid: string,
        data: Buffer,
        mimeType: string = "image/jpeg",
        options?: { caption?: string; width?: number; height?: number; replyToId?: string; replyToSenderJid?: string },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EEImage(this.handle, {
            chatJid,
            data: Array.from(data),
            mimeType,
            caption: options?.caption,
            width: options?.width,
            height: options?.height,
            replyToId: options?.replyToId,
            replyToSenderJid: options?.replyToSenderJid,
        });
    }

    /**
     * Send an E2EE video
     *
     * @param chatJid - Chat JID
     * @param data - Video data as Buffer
     * @param mimeType - MIME type (default: video/mp4)
     * @param options - Optional caption, dimensions, duration, and reply options
     */
    async sendE2EEVideo(
        chatJid: string,
        data: Buffer,
        mimeType: string = "video/mp4",
        options?: {
            caption?: string;
            width?: number;
            height?: number;
            duration?: number;
            replyToId?: string;
            replyToSenderJid?: string;
        },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EEVideo(this.handle, {
            chatJid,
            data: Array.from(data),
            mimeType,
            caption: options?.caption,
            width: options?.width,
            height: options?.height,
            duration: options?.duration,
            replyToId: options?.replyToId,
            replyToSenderJid: options?.replyToSenderJid,
        });
    }

    /**
     * Send an E2EE audio/voice message
     *
     * @param chatJid - Chat JID
     * @param data - Audio data as Buffer
     * @param mimeType - MIME type (default: audio/ogg)
     * @param options - Optional PTT (push-to-talk/voice message), duration, and reply options
     */
    async sendE2EEAudio(
        chatJid: string,
        data: Buffer,
        mimeType: string = "audio/ogg",
        options?: { ptt?: boolean; duration?: number; replyToId?: string; replyToSenderJid?: string },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EEAudio(this.handle, {
            chatJid,
            data: Array.from(data),
            mimeType,
            ptt: options?.ptt ?? false,
            duration: options?.duration,
            replyToId: options?.replyToId,
            replyToSenderJid: options?.replyToSenderJid,
        });
    }

    /**
     * Send an E2EE document/file
     *
     * @param chatJid - Chat JID
     * @param data - File data as Buffer
     * @param filename - Filename
     * @param mimeType - MIME type
     * @param options - Optional reply options
     */
    async sendE2EEDocument(
        chatJid: string,
        data: Buffer,
        filename: string,
        mimeType: string,
        options?: { replyToId?: string; replyToSenderJid?: string },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EEDocument(this.handle, {
            chatJid,
            data: Array.from(data),
            filename,
            mimeType,
            replyToId: options?.replyToId,
            replyToSenderJid: options?.replyToSenderJid,
        });
    }

    /**
     * Send an E2EE sticker
     *
     * @param chatJid - Chat JID
     * @param data - Sticker data as Buffer (WebP format)
     * @param mimeType - MIME type (default: image/webp)
     * @param options - Optional reply options
     */
    async sendE2EESticker(
        chatJid: string,
        data: Buffer,
        mimeType: string = "image/webp",
        options?: { replyToId?: string; replyToSenderJid?: string },
    ): Promise<SendMessageResult> {
        if (!this.handle) throw new Error("Not connected");
        return native.sendE2EESticker(this.handle, {
            chatJid,
            data: Array.from(data),
            mimeType,
            replyToId: options?.replyToId,
            replyToSenderJid: options?.replyToSenderJid,
        });
    }

    /**
     * Get the current E2EE device data as JSON string
     *
     * This returns the current in-memory E2EE device state, which includes:
     * - Noise key pair
     * - Identity key pair
     * - Signed pre-key
     * - Registration ID
     * - All sessions and identities
     *
     * Works with all device store modes:
     * - `e2eeMemoryOnly: true` - Get the ephemeral device data before it's lost
     * - `deviceData: "..."` - Get the updated state after sessions/keys change
     * - `devicePath: "..."` - Get current state (also auto-saved to file)
     *
     * Use cases:
     * - Save device data to database instead of file
     * - Backup device state periodically
     * - Transfer device state between instances
     *
     * @returns Device data as JSON string
     * @throws Error if not connected
     *
     * @example
     * ```typescript
     * // Save to database
     * const deviceData = client.getDeviceData();
     * await db.saveDeviceData(userId, deviceData);
     *
     * // Load on next startup
     * const client = new Client(cookies, {
     *     deviceData: await db.getDeviceData(userId)
     * });
     * ```
     */
    getDeviceData(): string {
        if (!this.handle) throw new Error("Not connected");
        const result = native.getDeviceData(this.handle);
        return result.deviceData;
    }

    /**
     * Download and decrypt E2EE media
     *
     * Use the mediaKey, mediaSha256, and directPath from attachment metadata
     * to download and decrypt encrypted media.
     *
     * @param options - Download options from attachment metadata
     * @returns Decrypted media data as Buffer
     *
     * @example
     * ```typescript
     * const attachment = message.attachments[0];
     * const result = await client.downloadE2EEMedia({
     *     directPath: attachment.directPath!,
     *     mediaKey: attachment.mediaKey!,
     *     mediaSha256: attachment.mediaSha256!,
     *     mediaEncSha256: attachment.mediaEncSha256,
     *     mediaType: attachment.type,
     *     mimeType: attachment.mimeType!,
     *     fileSize: attachment.fileSize!,
     * });
     * fs.writeFileSync('downloaded.jpg', result.data);
     * ```
     */
    async downloadE2EEMedia(options: {
        directPath: string;
        mediaKey: string;
        mediaSha256: string;
        mediaEncSha256?: string;
        mediaType: string;
        mimeType: string;
        fileSize: number;
    }): Promise<{ data: Buffer; mimeType: string; fileSize: number }> {
        if (!this.handle) throw new Error("Not connected");
        const result = await native.downloadE2EEMedia(this.handle, options);
        return {
            data: Buffer.from(result.data, "base64"),
            mimeType: result.mimeType,
            fileSize: result.fileSize,
        };
    }

    private startEventLoop(): void {
        if (this.eventLoopRunning) return;
        this.eventLoopRunning = true;
        this.eventLoopAbort = new AbortController();

        const loop = async () => {
            while (this.eventLoopRunning && this.handle) {
                try {
                    // Yield to event loop before polling to allow other operations
                    await new Promise(resolve => setImmediate(resolve));

                    const event = (await native.pollEvents(this.handle, 1000)) as ClientEvent;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (!event || (event as any).type === "timeout") continue;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if ((event as any).type === "closed") {
                        this.eventLoopRunning = false;
                        break;
                    }
                    this.handleEvent(event);
                } catch (err) {
                    if (this.eventLoopRunning) {
                        this.emit("error", err as Error);
                    }
                }
            }
        };

        // background task
        setImmediate(loop).unref();
    }

    private stopEventLoop(): void {
        this.eventLoopRunning = false;
        this.eventLoopAbort?.abort();
        this.eventLoopAbort = null;
    }

    private checkFullyReady(): void {
        if (this.isFullyReady && !this._fullyReadyEmitted) {
            this._fullyReadyEmitted = true;
            this.emit("fullyReady");
            // flush pending events
            const pending = this.pendingEvents;
            this.pendingEvents = [];
            for (const event of pending) {
                this.emitEvent(event);
            }
        }
    }

    private handleEvent(event: ClientEvent): void {
        switch (event.type) {
            // System events
            case "ready":
                this._socketReady = true;
                this.emit("ready", event.data);
                this.checkFullyReady();
                break;
            case "reconnected":
                this.emit("reconnected");
                break;
            case "disconnected":
                this._socketReady = false;
                this._e2eeConnected = false;
                this._fullyReadyEmitted = false;
                this.pendingEvents = [];
                this.emit("disconnected", event.data || {});
                break;
            case "error":
                this.emit("error", new Error(event.data.message));
                break;
            case "e2eeConnected":
                this._e2eeConnected = true;
                this.emit("e2eeConnected");
                this.checkFullyReady();
                break;
            case "deviceDataChanged":
                this.emit("deviceDataChanged", event.data);
                break;

            // queue until fullyReady
            case "message":
            case "messageEdit":
            case "messageUnsend":
            case "reaction":
            case "typing":
            case "readReceipt":
            case "e2eeMessage":
            case "e2eeReaction":
            case "e2eeReceipt":
                if (this._fullyReadyEmitted) {
                    this.emitEvent(event);
                } else {
                    this.pendingEvents.push(event);
                }
                break;
        }
    }

    private emitEvent(event: ClientEvent): void {
        switch (event.type) {
            case "message":
                this.emit("message", event.data);
                break;
            case "messageEdit":
                this.emit("messageEdit", event.data);
                break;
            case "messageUnsend":
                this.emit("messageUnsend", event.data);
                break;
            case "reaction":
                this.emit("reaction", event.data);
                break;
            case "typing":
                this.emit("typing", event.data);
                break;
            case "readReceipt":
                this.emit("readReceipt", event.data);
                break;
            case "e2eeMessage":
                this.emit("e2eeMessage", event.data);
                break;
            case "e2eeReaction":
                this.emit("e2eeReaction", event.data);
                break;
            case "e2eeReceipt":
                this.emit("e2eeReceipt", event.data);
                break;
        }
    }

    /**
     * Unload the native library (for cleanup)
     * @warn Any attempt to find or call a function from this library after unloading it will crash.
     * @returns void
     */
    public unloadLibrary(): void {
        if (this.handle) {
            native.unload();
        }
    }
}
