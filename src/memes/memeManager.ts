import * as vscode from 'vscode';

export interface Meme {
    postLink: string;
    subreddit: string;
    title: string;
    url: string;
    nsfw: boolean;
    spoiler: boolean;
    author: string;
    ups: number;
}

interface MemeApiResponse {
    count: number;
    memes: Meme[];
}

const MEME_API_URL = 'https://memesapi.vercel.app/give/40';
const MAX_MEMES_BEFORE_LOCK = 10;
const LOCK_DURATION_MS = 25 * 60 * 1000;

class MemeManager {
    private memes: Meme[] = [];
    private currentIndex: number = 0;
    private memesViewedThisSession: number = 0;
    private isLocked: boolean = false;
    private lockEndTime: number = 0;
    private onMemeCallback?: (meme: Meme) => void;
    private onLockCallback?: (remainingMs: number) => void;
    private onUnlockCallback?: () => void;

    public async initialize(): Promise<void> {
        await this.fetchMemes();
    }

    private async fetchMemes(): Promise<void> {
        try {
            const response = await fetch(MEME_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = (await response.json()) as MemeApiResponse;
            this.memes = data.memes.filter(m => !m.nsfw && !m.spoiler); // Filter out NSFW/spoiler content
            this.currentIndex = 0;
            console.log(`Fetched ${this.memes.length} memes`);
        } catch (error) {
            console.error('Failed to fetch memes:', error);
            vscode.window.showWarningMessage('Brainrot Buddy: Could not fetch memes. Check your internet connection.');
        }
    }

    public setOnMeme(callback: (meme: Meme) => void): void {
        this.onMemeCallback = callback;
    }

    public setOnLock(callback: (remainingMs: number) => void): void {
        this.onLockCallback = callback;
    }

    public setOnUnlock(callback: () => void): void {
        this.onUnlockCallback = callback;
    }

    public getRemainingLockTime(): number {
        if (!this.isLocked) {
            return 0;
        }
        const remaining = this.lockEndTime - Date.now();
        return Math.max(0, remaining);
    }

    public getMemesViewed(): number {
        return this.memesViewedThisSession;
    }

    public getMemesRemaining(): number {
        return MAX_MEMES_BEFORE_LOCK - this.memesViewedThisSession;
    }

    public isCurrentlyLocked(): boolean {
        // Check if lock has expired
        if (this.isLocked && Date.now() >= this.lockEndTime) {
            this.unlock();
        }
        return this.isLocked;
    }

    private lock(): void {
        this.isLocked = true;
        this.lockEndTime = Date.now() + LOCK_DURATION_MS;
        this.memesViewedThisSession = 0; // Reset for next session
        
        if (this.onLockCallback) {
            this.onLockCallback(LOCK_DURATION_MS);
        }

        // Set up auto-unlock
        setTimeout(() => {
            this.unlock();
        }, LOCK_DURATION_MS);
    }

    private unlock(): void {
        this.isLocked = false;
        this.lockEndTime = 0;
        
        if (this.onUnlockCallback) {
            this.onUnlockCallback();
        }

        // Refresh memes for the new session
        this.fetchMemes();
    }

    public async requestMeme(): Promise<Meme | null> {
        // Check if locked
        if (this.isCurrentlyLocked()) {
            const remainingMs = this.getRemainingLockTime();
            if (this.onLockCallback) {
                this.onLockCallback(remainingMs);
            }
            return null;
        }

        // Check if we need to refetch memes
        if (this.memes.length === 0 || this.currentIndex >= this.memes.length) {
            await this.fetchMemes();
        }

        // Still no memes available
        if (this.memes.length === 0) {
            return null;
        }

        // Get the next meme
        const meme = this.memes[this.currentIndex];
        this.currentIndex++;
        this.memesViewedThisSession++;

        // Check if we've hit the limit
        if (this.memesViewedThisSession >= MAX_MEMES_BEFORE_LOCK) {
            this.lock();
        }

        // Trigger callback
        if (this.onMemeCallback) {
            this.onMemeCallback(meme);
        }

        return meme;
    }

    public formatRemainingTime(ms: number): string {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Singleton instance
export const memeManager = new MemeManager();
