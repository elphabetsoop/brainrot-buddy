import * as vscode from 'vscode';
import { setPetState, setErrorState } from '../pet/petController';

export function getWorkspaceErrorCount(): number {
	const allDiagnostics = vscode.languages.getDiagnostics();
	let count = 0;
	for (const [_, diags] of allDiagnostics) {
		count += diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
	}
	return count;
}

export function hasWorkspaceErrors(): boolean {
	return getWorkspaceErrorCount() > 0;
}

export function setupDiagnosticsListener(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.languages.onDidChangeDiagnostics((e) => {
			const errorCount = getWorkspaceErrorCount();

			if (errorCount > 0) {
				setErrorState(errorCount);
			} else {
				setPetState('idle');
			}
		})
	);
}
