// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

type PetState = 'idle' | 'error' | 'success';

class PetViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'brainrotBuddy.petView';
	private _view?: vscode.WebviewView;
	private _currentState: PetState = 'idle';

	constructor(private readonly _extensionUri: vscode.Uri) {}

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
				message: message 
			});
		}
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

		.pet-wrapper {
			position: absolute;
			bottom: 0;
			left: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			transition: transform 0.1s linear;
		}

		.pet {
			height: 60px;
			width: auto;
			object-fit: contain;
			filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
			cursor: pointer;
			transition: transform 0.2s ease;
		}

		.pet:hover {
			transform: scale(1.1);
		}

		.pet.flipped {
			transform: scaleX(-1);
		}

		.pet:hover.flipped {
			transform: scaleX(-1) scale(1.1);
		}

		.chat-bubble {
			position: absolute;
			bottom: 70px;
			left: 50%;
			transform: translateX(-50%);
			background: #ffffff;
			color: #333333;
			padding: 8px 12px;
			border-radius: 12px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 12px;
			max-width: 150px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
			opacity: 0;
			transition: opacity 0.3s ease, transform 0.3s ease;
			white-space: nowrap;
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

		.state-dot {
			position: absolute;
			bottom: 5px;
			right: 5px;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: #2196f3;
			box-shadow: 0 0 6px rgba(33, 150, 243, 0.5);
		}

		.state-dot.error {
			background: #f44336;
			box-shadow: 0 0 6px rgba(244, 67, 54, 0.5);
		}

		.state-dot.success {
			background: #4caf50;
			box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
		}

		.state-dot.idle {
			background: #2196f3;
			box-shadow: 0 0 6px rgba(33, 150, 243, 0.5);
		}

		.walking .pet {
			animation:  0.3s ease-in-out infinite;
		}

		.walking .pet.flipped {
			animation:  0.3s ease-in-out infinite;
		}
	</style>
</head>
<body>
	<div class="pet-wrapper" id="petWrapper">
		<div class="chat-bubble" id="chatBubble"></div>
		<img src="${idlePath}" alt="Bibble" class="pet" id="petImage">
		<div class="state-dot idle" id="stateDot"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const petWrapper = document.getElementById('petWrapper');
		const petImage = document.getElementById('petImage');
		const chatBubble = document.getElementById('chatBubble');
		const stateDot = document.getElementById('stateDot');

		const images = {
			idle: '${idlePath}',
			error: '${errorPath}',
			success: '${successPath}'
		};

		let chatBubbleTimeout = null;
		let position = 50; // Start in middle (percentage)
		let direction = 1; // 1 = right, -1 = left
		let isWalking = true;
		let isPaused = false;
		const speed = 0.3; // Speed of walking

		// Initialize position
		updatePosition();

		// Walking animation loop
		function walk() {
			if (!isPaused && isWalking) {
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
			petImage.style.transform = petImage.classList.contains('flipped') 
				? 'scaleX(-1) translateY(-20px)' 
				: 'translateY(-20px)';
			setTimeout(() => {
				petImage.style.transform = petImage.classList.contains('flipped') 
					? 'scaleX(-1)' 
					: '';
			}, 200);
		});

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.type) {
				case 'stateChange':
					// Update pet image based on state
					petImage.src = images[message.state] || images.idle;
					
					// Update state indicator
					stateDot.className = 'state-dot ' + message.state;
					
					// Show message in chat bubble if provided
					if (message.message) {
						showChatBubble(message.message);
					}

					// Stop or pause walking on state change
					if (message.state === 'error') {
						isWalking = false;
					} else if (message.state === 'idle') {
						isWalking = true;
						chatBubble.classList.remove('visible');
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

// Global reference to the pet view provider
let petViewProvider: PetViewProvider;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Brainrot Buddy is now active!');

	// Create the pet view provider
	petViewProvider = new PetViewProvider(context.extensionUri);

	// Register the webview view provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			PetViewProvider.viewType,
			petViewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('brainrot-buddy.showPet', () => {
			vscode.commands.executeCommand('brainrotBuddy.petView.focus');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('brainrot-buddy.helloWorld', () => {
			vscode.window.showInformationMessage('Hello from Brainrot Buddy!');
		})
	);

	// Listen for diagnostic changes (errors/warnings)
	context.subscriptions.push(
		vscode.languages.onDidChangeDiagnostics((e) => {
			// Check all changed URIs for errors
			let hasErrors = false;
			for (const uri of e.uris) {
				const diagnostics = vscode.languages.getDiagnostics(uri);
				const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
				if (errors.length > 0) {
					hasErrors = true;
					break;
				}
			}

			if (hasErrors) {
				petViewProvider.setState('error', 'knn gt error wtf');
			} else {
				// Check if there are any errors anywhere in the workspace
				const allDiagnostics = vscode.languages.getDiagnostics();
				const anyErrors = allDiagnostics.some(([_, diags]) => 
					diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
				);
				
				if (!anyErrors) {
					petViewProvider.setState('idle');
				}
			}
		})
	);

	// Listen for git commits
	setupGitCommitListener(context);
}

async function setupGitCommitListener(context: vscode.ExtensionContext) {
	// Wait for git extension to be available
	const gitExtension = vscode.extensions.getExtension('vscode.git');
	if (!gitExtension) {
		console.log('Git extension not found');
		return;
	}

	// Wait for git extension to activate
	let gitApi;
	try {
		const exports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
		gitApi = exports.getAPI(1);
	} catch (e) {
		console.log('Failed to activate git extension:', e);
		return;
	}

	if (!gitApi) {
		return;
	}

	const git = gitApi;
	let lastHeadCommit: string | undefined;

	function checkForCommit(repo: any) {
		const currentHead = repo.state.HEAD?.commit;
		
		if (currentHead && lastHeadCommit && currentHead !== lastHeadCommit) {
			// HEAD changed - new commit!
			petViewProvider.setState('success', 'Great commit! 🎉');
			
			// Return to appropriate state after celebration
			setTimeout(() => {
				const allDiagnostics = vscode.languages.getDiagnostics();
				const anyErrors = allDiagnostics.some(([_, diags]) => 
					diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
				);
				
				if (anyErrors) {
					petViewProvider.setState('error');
				} else {
					petViewProvider.setState('idle');
				}
			}, 5000);
		}
		
		lastHeadCommit = currentHead;
	}

	// Watch existing repositories
	for (const repo of git.repositories) {
		repo.state.onDidChange(() => checkForCommit(repo));
	}

	// Watch for new repositories
	git.onDidOpenRepository((repo: any) => {
		repo.state.onDidChange(() => checkForCommit(repo));
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
