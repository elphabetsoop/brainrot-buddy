import * as vscode from 'vscode';

export class SuccessPopupPanel {
	public static currentPanel: SuccessPopupPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: vscode.ViewColumn.One;

		// show existing panel
		if (SuccessPopupPanel.currentPanel) {
			SuccessPopupPanel.currentPanel._panel.reveal(column);
			return;
		}

		// create a new panel if no existing panel
		const panel = vscode.window.createWebviewPanel(
			'successPopup',
			'Success!',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);

		SuccessPopupPanel.currentPanel = new SuccessPopupPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		SuccessPopupPanel.currentPanel = new SuccessPopupPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'close':
						this._panel.dispose();
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		SuccessPopupPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview(): string {
		const snorlaxPath = this._panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'success', 'snorlax.png')
		);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Success!</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			width: 100%;
			height: 100%;
			background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
			overflow: hidden;
		}

		.container {
			text-align: center;
			opacity: 0;
			animation: fadeInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		}

		@keyframes fadeInScale {
			0% {
				transform: scale(0.3);
				opacity: 0;
			}
			100% {
				transform: scale(1);
				opacity: 1;
			}
		}

		.image {
			max-width: 400px;
			max-height: 400px;
			object-fit: contain;
			filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
			margin-bottom: 20px;
		}

		.message {
			font-size: 24px;
			font-weight: 600;
			color: #4caf50;
			margin-bottom: 10px;
		}

		.subtext {
			font-size: 14px;
			color: #666;
		}
	</style>
</head>
<body>
	<div class="container">
		<img src="${snorlaxPath}" alt="Success" class="image">
	</div>

    <script src="https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js"></script>

	<script>
		const vscode = acquireVsCodeApi();

		// Auto-close after 3 seconds
		setTimeout(() => {
			vscode.postMessage({
				command: 'close'
			});
		}, 3000);
	</script>
    <script>
        const jsConfetti = new JSConfetti();
        jsConfetti.addConfetti();
    </script>
</body>
</html>`;
	}
}
