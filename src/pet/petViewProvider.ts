import * as vscode from 'vscode';
import { actions, errorMessageTiers, successMessages, getErrorMessageForCount } from '../states/stateManager';

export type PetState = 'idle' | 'error' | 'success';

export class PetViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'brainrotBuddy.petView';
	private _view?: vscode.WebviewView;
	private _currentState: PetState = 'idle';

	constructor(private readonly _extensionUri: vscode.Uri) { }

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

		// Serialize meme data for the webview
		const errorMessageTiersJson = JSON.stringify(errorMessageTiers);
		const successMessagesJson = JSON.stringify(successMessages);
		const actionsJson = JSON.stringify(actions);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
			font-size: 12px;
			color: #888888;
			text-align: center;
			padding: 6px 12px;
			background: rgba(30, 30, 30, 0.8);
			border-radius: 12px;
			white-space: nowrap;
		}

		.status-bar .feeling {
			color: #4caf50;
			font-weight: 500;
		}

		.status-bar .feeling.error {
			color: #f44336;
		}

		.status-bar .feeling.success {
			color: #4caf50;
		}

		.status-bar .feeling.idle {
			color: #2196f3;
		}

		.pet-wrapper {
			position: absolute;
			bottom: 0;
			left: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
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
	<div class="pet-wrapper" id="petWrapper">
		<div class="chat-bubble" id="chatBubble"></div>
		<img src="${idlePath}" alt="Bibble" class="pet" id="petImage">
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const petWrapper = document.getElementById('petWrapper');
		const petImage = document.getElementById('petImage');
		const chatBubble = document.getElementById('chatBubble');
		const statusBar = document.getElementById('statusBar');
		const feelingText = document.getElementById('feelingText');

		const images = {
			idle: '${idlePath}',
			error: '${errorPath}',
			success: '${successPath}'
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
		const speed = 0.3; // Speed of walking

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

		// Click to make pet jump
		petImage.addEventListener('click', () => {
			petImage.classList.add('jumping');
			setTimeout(() => {
				petImage.classList.remove('jumping');
			}, 200);
		});

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.type) {
				case 'stateChange':
					// Update pet image based on state
					petImage.src = images[message.state] || images.idle;
					
					// Update feeling text
					feelingText.textContent = actions[message.state] || actions.idle;
					feelingText.className = 'is ' + message.state;

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
					} else {
						isError = false;
						isWalking = true;
						resetPetStyle();
					}
					break;

				case 'chatBubble':
					showChatBubble(message.message, message.duration);
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
