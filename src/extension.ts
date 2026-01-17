// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

type PetState = 'idle' | 'error' | 'success';

class PetViewProvider implements vscode.WebviewViewProvider {
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
			padding: 8px 12px;
			border-radius: 12px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			font-size: 12px;
			max-width: 180px;
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

		const errorMessages = [
			"eh why got error sia",
			"knn gt error",
			"cb got bug",
			"oi error lah help",
		];

		const successMessages = [
			"FIRE COMMIT",
			"YES LAHHHH",
		];

		const actions = {
			idle: "bingchilling",
			error: "crashing out",
			success: "says FIREEEE"
		};

		let chatBubbleTimeout = null;
		let position = 50; // Start in middle (percentage)
		let direction = 1; // 1 = right, -1 = left
		let isWalking = true;
		let isPaused = false;
		let isError = false;
		const speed = 0.3; // Speed of walking

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
						// Pick random error message
						const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
						showChatBubble(randomError, 10000);
					} else if (message.state === 'success') {
						isError = false;
						isWalking = false;
						// Pick random success message
						const randomSuccess = successMessages[Math.floor(Math.random() * successMessages.length)];
						showChatBubble(randomSuccess);
						setTimeout(() => { isWalking = true; }, 3000);
					} else {
						isError = false;
						isWalking = true;
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
				petViewProvider.setState('error');
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

	if (!gitApi) return;

	// Track last known HEAD per repp from repo.rootUri.toString()
	const lastHeadByRepo = new Map<string, string | undefined>();
	// Track timeout handles per repo so we can cancel/replace them
	const timeoutByRepo = new Map<string, ReturnType<typeof setTimeout>>();

	// helper to set pet back to idle or error after timeout
	function restorePetStateAfterTimeout(repoId: string) {
		// Clear any existing timeout for repo (safety)
		const existing = timeoutByRepo.get(repoId);
		if (existing) {
			clearTimeout(existing);
			timeoutByRepo.delete(repoId);
		}

		const handle = setTimeout(() => {
			timeoutByRepo.delete(repoId);

			// If there are any workspace errors, set error; otherwise idle
			const allDiagnostics = vscode.languages.getDiagnostics();
			const anyErrors = allDiagnostics.some(([_, diags]) =>
				diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
			);

			if (anyErrors) {
				petViewProvider.setState('error');
			} else {
				petViewProvider.setState('idle');
			}
		}, 5000); // 5 seconds

		timeoutByRepo.set(repoId, handle);
	}

	function checkForCommit(repo: any) {
		const repoId = repo.rootUri?.toString() ?? repo.path ?? Math.random().toString();
		const currentHead: string | undefined = repo.state.HEAD?.commit;

		const previousHead = lastHeadByRepo.get(repoId);
		// If we had previous head and it's changed -> new commit happened
		if (previousHead && currentHead && previousHead !== currentHead) {
			// show success briefly
			petViewProvider.setState('success');

			// clear then set a new one
			restorePetStateAfterTimeout(repoId);
		}

		// always update last known head (even if undefined)
		lastHeadByRepo.set(repoId, currentHead);
	}

	// Wire existing repositories
	const repoDisposables: vscode.Disposable[] = [];
	for (const repo of gitApi.repositories) {
		const repoId = repo.rootUri?.toString() ?? repo.path ?? Math.random().toString();
		lastHeadByRepo.set(repoId, repo.state.HEAD?.commit);
		// repo.state.onDidChange is an Event, subscribing returns a Disposable
		const disp = repo.state.onDidChange(() => checkForCommit(repo));
		repoDisposables.push(disp);
		context.subscriptions.push(disp);
	}

	// Listen for newly opened repositories
	const openRepoDisp = gitApi.onDidOpenRepository((repo: any) => {
		const repoId = repo.rootUri?.toString() ?? repo.path ?? Math.random().toString();
		lastHeadByRepo.set(repoId, repo.state.HEAD?.commit);
		const disp = repo.state.onDidChange(() => checkForCommit(repo));
		repoDisposables.push(disp);
		context.subscriptions.push(disp);
	});
	context.subscriptions.push(openRepoDisp);

	// Clean up timeouts on deactivate / disposal
	const cleanupDisposable = new vscode.Disposable(() => {
		for (const t of timeoutByRepo.values()) {
			clearTimeout(t);
		}
		timeoutByRepo.clear();
		lastHeadByRepo.clear();
	});
	context.subscriptions.push(cleanupDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
