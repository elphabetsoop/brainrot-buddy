import * as vscode from 'vscode';
import { setPetState } from '../pet/petController';

export function hasWorkspaceErrors(): boolean {
	const allDiagnostics = vscode.languages.getDiagnostics();
	return allDiagnostics.some(([_, diags]) =>
		diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
	);
}

export function setupDiagnosticsListener(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.languages.onDidChangeDiagnostics((e) => {
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
				setPetState('error');
			} else {
				if (!hasWorkspaceErrors()) {
					setPetState('idle');
				}
			}
		})
	);
}
