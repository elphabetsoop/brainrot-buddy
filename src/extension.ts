// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

class PetPanel {
	public static currentPanel: PetPanel | undefined;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (PetPanel.currentPanel) {
			PetPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'petPanel',
			'Brainrot Buddy',
			column || vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);

		PetPanel.currentPanel = new PetPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
	}

	public dispose() {
		PetPanel.currentPanel = undefined;
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const mediaPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'idle');
		console.log('Media Path:', mediaPath.fsPath);
		const bibblePath = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'bibble.png'));

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Brainrot Buddy</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			display: flex;
			justify-content: center;
			align-items: flex-end;
			height: 100vh;
			background: transparent;
			overflow: hidden;
		}

		.pet-container {
			position: relative;
			display: flex;
			justify-content: center;
			align-items: flex-end;
			width: 100%;
			height: 100%;
		}

		.pet {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
		}

		.pet-name {
			position: absolute;
			top: 10px;
			font-size: 14px;
			color: #cccccc;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
			letter-spacing: 0.5px;
		}
	</style>
</head>
<body>
	<div class="pet-container">
		<div class="pet-name">Bibble</div>
		<img src="${bibblePath}" alt="Bibble the Pet" class="pet">
	</div>
</body>
</html>`;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "brainrot-buddy" is now active!');

	// Create pet panel command
	const petPanelDisposable = vscode.commands.registerCommand('brainrot-buddy.showPet', () => {
		PetPanel.createOrShow(context.extensionUri);
	});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('brainrot-buddy.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from brainrot-buddy!');
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(petPanelDisposable);

	// Automatically show the pet panel on activation
	PetPanel.createOrShow(context.extensionUri);
}

// This method is called when your extension is deactivated
export function deactivate() {}
