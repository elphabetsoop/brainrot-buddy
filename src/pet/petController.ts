import * as vscode from 'vscode';
import { PetViewProvider, PetState } from './petViewProvider';
import { SuccessPopupPanel } from './successPopupPanel';

let petViewProvider: PetViewProvider | undefined;
let extensionUri: vscode.Uri;

export function initializePetController(context: vscode.ExtensionContext): PetViewProvider {
	petViewProvider = new PetViewProvider(context.extensionUri);
	extensionUri = context.extensionUri;

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

	return petViewProvider;
}

export function getPetViewProvider(): PetViewProvider | undefined {
	return petViewProvider;
}

export function setPetState(state: PetState, message?: string): void {
	petViewProvider?.setState(state, message);
	
	// Show success popup when state is success
	if (state === 'success') {
		SuccessPopupPanel.createOrShow(extensionUri);
	}
}

export function setErrorState(errorCount: number): void {
	petViewProvider?.setErrorState(errorCount);
}

export function showChatBubble(message: string, duration?: number): void {
	petViewProvider?.showChatBubble(message, duration);
}
