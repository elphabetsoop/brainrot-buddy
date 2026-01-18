import * as vscode from 'vscode';
import { actions, errorMessageTiers, successMessages, getErrorMessageForCount } from '../states/stateManager';
import { memeManager, Meme } from '../memes/memeManager';

export type PetState = 'idle' | 'error' | 'success' | 'lengthyWarning' | 'locked';

export class PetViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'brainrotBuddy.petView';
	private _view?: vscode.WebviewView;
	private _currentState: PetState = 'idle';
	private _lockTimerInterval?: NodeJS.Timeout;

	constructor(private readonly _extensionUri: vscode.Uri) {
		memeManager.setOnLock((remainingMs) => {
			this.showLockState(remainingMs);
		});

		memeManager.setOnUnlock(() => {
			this.hideLockState();
		});
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.type === 'petClicked') {
				await this.handlePetClick();
			}
		});
	}

	private async handlePetClick(): Promise<void> {
		if (memeManager.isCurrentlyLocked()) {
			const remainingMs = memeManager.getRemainingLockTime();
			this.showLockState(remainingMs);
			return;
		}

		const meme = await memeManager.requestMeme();
		if (meme) {
			this.showMeme(meme);
		}
	}

	public showMeme(meme: Meme): void {
		const remaining = memeManager.getMemesRemaining();
		if (this._view) {
			this._view.webview.postMessage({
				type: 'showMeme',
				meme: meme,
				memesRemaining: remaining
			});
		}
	}

	public showLockState(remainingMs: number): void {
		this._currentState = 'locked';
		if (this._view) {
			this._view.webview.postMessage({
				type: 'lockState',
				remainingMs: remainingMs
			});
		}

		// Start updating the timer
		if (this._lockTimerInterval) {
			clearInterval(this._lockTimerInterval);
		}

		this._lockTimerInterval = setInterval(() => {
			const remaining = memeManager.getRemainingLockTime();
			if (remaining <= 0) {
				this.hideLockState();
			} else if (this._view) {
				this._view.webview.postMessage({
					type: 'lockState',
					remainingMs: remaining
				});
			}
		}, 1000);
	}

	public hideLockState(): void {
		if (this._lockTimerInterval) {
			clearInterval(this._lockTimerInterval);
			this._lockTimerInterval = undefined;
		}

		this._currentState = 'idle';
		if (this._view) {
			this._view.webview.postMessage({
				type: 'unlockState'
			});
		}
	}

	public setState(state: PetState, message?: string) {
		this._currentState = state;
		if (this._view) {
			this._view.webview.postMessage({
				type: 'stateChange',
				state: state,
				message: message,
				errorCount: 0
			});
		}
	}

	public setErrorState(errorCount: number) {
		this._currentState = 'error';
		const message = getErrorMessageForCount(errorCount);
		if (this._view) {
			this._view.webview.postMessage({
				type: 'stateChange',
				state: 'error',
				message: message,
				errorCount: errorCount
			});
		}
	}

	public getCurrentState(): PetState {
		return this._currentState;
	}

	public showChatBubble(message: string, duration: number = 5000) {
		if (this._view) {
			this._view.webview.postMessage({
				type: 'chatBubble',
				message: message,
				duration: duration
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get URIs for all state images
		const idlePath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'idle', 'bibble.png'));
		const errorPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'error', 'bibble.png'));
		const successPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'success', 'bibble.png'));
		const lengthyWarningPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'lengthyWarning', 'bibble.png'));

		// Serialize meme data for the webview
		const errorMessageTiersJson = JSON.stringify(errorMessageTiers);
		const successMessagesJson = JSON.stringify(successMessages);
		const actionsJson = JSON.stringify(actions);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
	<title>Brainrot Buddy</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			width: 100%;
			height: 100vh;
			background: transparent;
			overflow: hidden;
			position: relative;
		}

		.status-bar {
			position: absolute;
			top: 10px;
			left: 50%;
			transform: translateX(-50%);
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 13px;
			color: #cccccc;
			text-align: center;
			padding: 8px 16px;
			background: linear-gradient(135deg, rgba(40, 40, 50, 0.95), rgba(30, 30, 40, 0.95));
			border-radius: 16px;
			white-space: nowrap;
			z-index: 2001;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
			backdrop-filter: blur(10px);
		}

		.status-bar .feeling {
			font-weight: 600;
			transition: all 0.3s ease;
		}

		.status-bar .feeling.idle {
			color: #64b5f6;
			text-shadow: 0 0 8px #64b5f6, 0 0 16px #42a5f5, 0 0 24px #2196f3;
			animation: pulseBlue 2s ease-in-out infinite;
		}

		.status-bar .feeling.error {
			color: #ff5252;
			text-shadow: 0 0 8px #ff5252, 0 0 16px #f44336, 0 0 24px #d32f2f, 0 0 32px #b71c1c;
			animation: pulseRed 0.5s ease-in-out infinite;
		}

		.status-bar .feeling.success {
			color: #69f0ae;
			text-shadow: 0 0 8px #69f0ae, 0 0 16px #00e676, 0 0 24px #00c853, 0 0 32px #ffd700;
			animation: pulseGreen 1s ease-in-out infinite;
		}

		.status-bar .feeling.lengthyWarning {
			color: #ffb74d;
			text-shadow: 0 0 8px #ffb74d, 0 0 16px #ffa726, 0 0 24px #ff9800;
			animation: pulseOrange 1.5s ease-in-out infinite;
		}

		.status-bar .feeling.locked {
			opacity: 0.7;
			filter: grayscale(30%);
		}

		@keyframes pulseBlue {
			0%, 100% { text-shadow: 0 0 8px #64b5f6, 0 0 16px #42a5f5, 0 0 24px #2196f3; }
			50% { text-shadow: 0 0 12px #64b5f6, 0 0 24px #42a5f5, 0 0 36px #2196f3; }
		}

		@keyframes pulseRed {
			0%, 100% { text-shadow: 0 0 8px #ff5252, 0 0 16px #f44336, 0 0 24px #d32f2f; }
			50% { text-shadow: 0 0 16px #ff5252, 0 0 32px #f44336, 0 0 48px #d32f2f; }
		}

		@keyframes pulseGreen {
			0%, 100% { text-shadow: 0 0 8px #69f0ae, 0 0 16px #00e676, 0 0 24px #00c853; }
			50% { text-shadow: 0 0 16px #69f0ae, 0 0 32px #00e676, 0 0 48px #ffd700; }
		}

		@keyframes pulseOrange {
			0%, 100% { text-shadow: 0 0 8px #ffb74d, 0 0 16px #ffa726, 0 0 24px #ff9800; }
			50% { text-shadow: 0 0 12px #ffb74d, 0 0 20px #ffa726, 0 0 32px #ff9800; }
		}

		.meme-counter {
			position: absolute;
			top: 45px;
			left: 50%;
			transform: translateX(-50%);
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 11px;
			color: #aaaaaa;
			text-align: center;
			padding: 6px 12px;
			background: linear-gradient(135deg, rgba(50, 50, 60, 0.9), rgba(40, 40, 50, 0.9));
			border-radius: 12px;
			z-index: 2001;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08);
			backdrop-filter: blur(8px);
			transition: all 0.3s ease;
		}

		.meme-counter:hover {
			background: linear-gradient(135deg, rgba(60, 60, 70, 0.95), rgba(50, 50, 60, 0.95));
			transform: translateX(-50%) scale(1.02);
		}

		.meme-overlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: calc(100% - 80px);
			background: rgba(0, 0, 0, 0.85);
			display: none;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			z-index: 50;
			padding: 75px 10px 10px 10px;
			pointer-events: none;
		}

		.meme-overlay.visible {
			display: flex;
		}

		.meme-image {
			max-width: 100%;
			max-height: 70%;
			object-fit: contain;
			border-radius: 8px;
		}

		.meme-title {
			color: #ffffff;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 12px;
			text-align: center;
			margin-top: 10px;
			max-width: 90%;
			word-wrap: break-word;
		}

		.meme-info {
			color: #888888;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 10px;
			margin-top: 5px;
		}

		.meme-close-hint {
			color: #666666;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 10px;
			margin-top: 15px;
		}

		.lock-overlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(20, 20, 20, 0.95);
			display: none;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			z-index: 1001;
		}

		.lock-overlay.visible {
			display: flex;
		}

		.lock-timer {
			font-family: 'Courier New', monospace;
			font-size: 48px;
			color: #ff9800;
			font-weight: bold;
		}

		.lock-message {
			color: #ffffff;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 14px;
			text-align: center;
			margin-top: 15px;
			max-width: 80%;
		}

		.lock-submessage {
			color: #888888;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 11px;
			text-align: center;
			margin-top: 8px;
		}

		.pet-wrapper {
			position: absolute;
			bottom: 0;
			left: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			z-index: 2000;
		}

		.pet {
			height: 60px;
			width: auto;
			object-fit: contain;
			filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
			cursor: pointer;
		}

		.pet.flipped {
			transform: scaleX(-1);
		}

		.chat-bubble {
			position: absolute;
			bottom: 70px;
			left: 50%;
			transform: translateX(-50%);
			background: #ffffff;
			color: #333333;
			padding: 8px 16px;
			border-radius: 12px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 14px;
			font-weight: 500;
			min-width: 150px;
			max-width: 280px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
			opacity: 0;
			transition: all 0.3s ease;
			white-space: nowrap;
			text-align: center;
			z-index: 100;
		}

		.chat-bubble.visible {
			opacity: 1;
		}

		.chat-bubble::after {
			content: '';
			position: absolute;
			bottom: -6px;
			left: 50%;
			transform: translateX(-50%);
			width: 0;
			height: 0;
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 6px solid #ffffff;
		}

		.pet-name {
			position: absolute;
			bottom: 65px;
			left: 50%;
			transform: translateX(-50%);
			font-size: 10px;
			color: #888888;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		.pet-wrapper:hover .pet-name {
			opacity: 1;
		}


		@keyframes jump {
			0%, 100% { transform: translateY(0); }
			50% { transform: translateY(-20px); }
		}

		@keyframes jumpFlipped {
			0%, 100% { transform: scaleX(-1) translateY(0); }
			50% { transform: scaleX(-1) translateY(-20px); }
		}

		.walking .pet {
			animation: 0.3s ease-in-out infinite;
		}

		.walking .pet.flipped {
			animation: 0.3s ease-in-out infinite;
		}

		.pet.jumping {
			animation: jump 0.2s ease-out;
		}

		.pet.jumping.flipped {
			animation: jumpFlipped 0.2s ease-out;
		}
	</style>
</head>
<body>
	<div class="status-bar" id="statusBar">
		Bibble is <span class="feeling idle" id="feelingText">bingchilling</span>
	</div>
	<div class="meme-counter" id="memeCounter">Pet Bibble to start scrolling!</div>
	<div class="pet-wrapper" id="petWrapper">
		<div class="chat-bubble" id="chatBubble"></div>
		<img src="${idlePath}" alt="Bibble" class="pet" id="petImage">
	</div>

	<!-- Meme overlay -->
	<div class="meme-overlay" id="memeOverlay">
		<img class="meme-image" id="memeImage" src="" alt="Meme">
		<div class="meme-title" id="memeTitle"></div>
		<div class="meme-info" id="memeInfo"></div>
		<div class="meme-close-hint">Click Bibble for next meme!</div>
	</div>

	<!-- Lock overlay -->
	<div class="lock-overlay" id="lockOverlay">
		<div class="lock-timer" id="lockTimer">25:00</div>
		<div class="lock-message">lock in time 🍅</div>
		<div class="lock-submessage">lock in neow!!!</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const petWrapper = document.getElementById('petWrapper');
		const petImage = document.getElementById('petImage');
		const chatBubble = document.getElementById('chatBubble');
		const statusBar = document.getElementById('statusBar');
		const feelingText = document.getElementById('feelingText');
		const memeOverlay = document.getElementById('memeOverlay');
		const memeImage = document.getElementById('memeImage');
		const memeTitle = document.getElementById('memeTitle');
		const memeInfo = document.getElementById('memeInfo');
		const memeCounter = document.getElementById('memeCounter');
		const lockOverlay = document.getElementById('lockOverlay');
		const lockTimer = document.getElementById('lockTimer');

		const images = {
			idle: '${idlePath}',
			error: '${errorPath}',
			success: '${successPath}',
			lengthyWarning: '${lengthyWarningPath}'
		};

		const errorMessageTiers = ${errorMessageTiersJson};
		const successMessages = ${successMessagesJson};
		const actions = ${actionsJson};

		// Base size and max scaling
		const BASE_PET_HEIGHT = 60;
		const MAX_ERROR_SCALE = 2.0; // Max 2x size at 5+ errors
		const MAX_SATURATION = 5.0; // Max 500% saturation at 5+ errors - FRIED

		let chatBubbleTimeout = null;
		let position = 50; // Start in middle (percentage)
		let direction = 1; // 1 = right, -1 = left
		let isWalking = true;
		let isPaused = false;
		let isError = false;
		const speed = 0.1; // Speed of walking

		// Get error message based on count
		function getErrorMessageForCount(errorCount) {
			let message = errorMessageTiers[0].message;
			for (const tier of errorMessageTiers) {
				if (errorCount >= tier.threshold) {
					message = tier.message;
				}
			}
			return message;
		}

		// Calculate scale and saturation based on error count
		function getErrorIntensity(errorCount) {
			// Scale from 1 to 5 errors (capped at 5)
			const normalizedCount = Math.min(errorCount, 5);
			const intensity = (normalizedCount - 1) / 4; // 0 at 1 error, 1 at 5 errors
			
			const scale = 1 + intensity * (MAX_ERROR_SCALE - 1);
			const saturation = 1 + intensity * (MAX_SATURATION - 1);
			
			return { scale, saturation };
		}

		// Apply error intensity styling
		function applyErrorIntensity(errorCount) {
			const { scale, saturation } = getErrorIntensity(errorCount);
			const newHeight = BASE_PET_HEIGHT * scale;
			petImage.style.height = newHeight + 'px';
			petImage.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) saturate(' + saturation + ')';
			
			// Scale up chat bubble too - get more FRIED
			const bubbleScale = 1 + (scale - 1) * 0.5; // Bubble grows at half the rate
			const fontSize = 14 * bubbleScale;
			const padding = 8 * bubbleScale;
			const hPadding = 16 * bubbleScale;
			
			// Red tint increases with errors
			const redIntensity = Math.min((errorCount - 1) / 4, 1);
			const r = Math.round(255);
			const g = Math.round(255 - (redIntensity * 100));
			const b = Math.round(255 - (redIntensity * 100));
			
			chatBubble.style.fontSize = fontSize + 'px';
			chatBubble.style.padding = padding + 'px ' + hPadding + 'px';
			chatBubble.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
			chatBubble.style.fontWeight = errorCount >= 4 ? '700' : '500';
			
			// Move chat bubble up to stay above the bigger pet
			chatBubble.style.bottom = (newHeight + 15) + 'px';
		}

		// Reset to normal styling
		function resetPetStyle() {
			petImage.style.height = BASE_PET_HEIGHT + 'px';
			petImage.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';
			chatBubble.style.bottom = '70px';
			chatBubble.style.fontSize = '14px';
			chatBubble.style.padding = '8px 16px';
			chatBubble.style.background = '#ffffff';
			chatBubble.style.fontWeight = '500';
		}

		// Initialize position
		updatePosition();

		// Walking animation loop
		function walk() {
			if (!isPaused && isWalking && !isError) {
				position += speed * direction;

				// Bounce off edges
				if (position >= 90) {
					position = 90;
					direction = -1;
					petImage.classList.add('flipped');
				} else if (position <= 5) {
					position = 5;
					direction = 1;
					petImage.classList.remove('flipped');
				}

				updatePosition();
				petWrapper.classList.add('walking');
			} else {
				petWrapper.classList.remove('walking');
			}

			requestAnimationFrame(walk);
		}

		function updatePosition() {
			petWrapper.style.left = position + '%';
			petWrapper.style.transform = 'translateX(-50%)';
		}

		function moveToCenter() {
			position = 50;
			updatePosition();
			petImage.classList.remove('flipped');
		}

		// Start walking
		walk();

		// Pause walking when hovering
		petWrapper.addEventListener('mouseenter', () => {
			isPaused = true;
		});

		petWrapper.addEventListener('mouseleave', () => {
			isPaused = false;
		});

		// Click to make pet jump and request meme
		petImage.addEventListener('click', () => {
			petImage.classList.add('jumping');
			setTimeout(() => {
				petImage.classList.remove('jumping');
			}, 200);
			
			// Request a meme from the extension
			vscode.postMessage({ type: 'petClicked' });
		});

		// Meme overlay is non-interactive, clicks pass through to Bibble

		// Format time from milliseconds to MM:SS
		function formatTime(ms) {
			const totalSeconds = Math.ceil(ms / 1000);
			const minutes = Math.floor(totalSeconds / 60);
			const seconds = totalSeconds % 60;
			return minutes + ':' + seconds.toString().padStart(2, '0');
		}

		// Update meme counter display
		function updateMemeCounter(remaining) {
			if (remaining <= 0) {
				memeCounter.textContent = 'time to lock in! 🍅';
			} else {
				memeCounter.textContent = 'Pet Bibble for memes! (' + remaining + ' left)';
			}
		}

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.type) {
				case 'stateChange':
					// Update pet image based on state
					petImage.src = images[message.state] || images.idle;
					
					// Update feeling text
					feelingText.textContent = actions[message.state] || actions.idle;
					feelingText.className = 'feeling ' + message.state;

					if (message.state === 'error') {
						isError = true;
						isWalking = false;
						moveToCenter();
						
						// Apply error intensity (size + saturation)
						const errorCount = message.errorCount || 1;
						applyErrorIntensity(errorCount);
						
						// Get error message based on count
						const errorMsg = message.message || getErrorMessageForCount(errorCount);
						showChatBubble(errorMsg, 10000);
					} else if (message.state === 'success') {
						isError = false;
						isWalking = false;
						resetPetStyle();
						// Pick random success message
						const randomSuccess = successMessages[Math.floor(Math.random() * successMessages.length)];
						showChatBubble(randomSuccess);
						setTimeout(() => { isWalking = true; }, 3000);
					} else if (message.state === 'lengthyWarning'){
						isError = false;
						isWalking = false;
						moveToCenter();
						setTimeout(() => { isWalking = true; }, 3000);
						resetPetStyle();
					}
					 else {
						isError = false;
						isWalking = true;
						resetPetStyle();
					}
					break;

				case 'chatBubble':
					showChatBubble(message.message, message.duration);
					break;

				case 'showMeme':
					// Display the meme in the overlay
					memeImage.src = message.meme.url;
					memeTitle.textContent = message.meme.title;
					memeInfo.textContent = 'r/' + message.meme.subreddit + ' • ' + message.meme.ups + ' upvotes';
					memeOverlay.classList.add('visible');
					updateMemeCounter(message.memesRemaining);
					break;

				case 'lockState':
					// Show the lock overlay with timer
					lockOverlay.classList.add('visible');
					lockTimer.textContent = formatTime(message.remainingMs);
					// Add locked class without changing the mood text
					feelingText.classList.add('locked');
					updateMemeCounter(0);
					break;

				case 'unlockState':
					// Hide the lock overlay
					lockOverlay.classList.remove('visible');
					// Remove locked class without changing the mood text
					feelingText.classList.remove('locked');
					updateMemeCounter(20);
					break;
			}
		});

		function showChatBubble(text, duration = 5000) {
			if (chatBubbleTimeout) {
				clearTimeout(chatBubbleTimeout);
			}

			chatBubble.textContent = text;
			chatBubble.classList.add('visible');

			chatBubbleTimeout = setTimeout(() => {
				chatBubble.classList.remove('visible');
			}, duration);
		}
	</script>
</body>
</html>`;
	}
}
