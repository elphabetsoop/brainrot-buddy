// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { initializePetController } from './pet/petController';
import { setupDiagnosticsListener } from './diagnostics/diagnosticsListener';
import { setupGitCommitListener } from './git/gitCommitListener';
import { setupLongFunctionListener } from './utils/checklongFunction';
import { memeManager } from './memes/memeManager';

// This method is called when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
	console.log('Brainrot Buddy is now active!');

	// Initialize memes (fetch 40 memes from the API)
	await memeManager.initialize();

	// Initialize the pet view and register commands
	initializePetController(context);

	// Set up listeners
	setupDiagnosticsListener(context);
	setupGitCommitListener(context);

	setupLongFunctionListener(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
