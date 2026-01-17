import * as vscode from 'vscode';
import { setPetState } from '../pet/petController';
import { hasWorkspaceErrors } from '../diagnostics/diagnosticsListener';

export async function setupGitCommitListener(context: vscode.ExtensionContext): Promise<void> {
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

	// Track last known HEAD per repo from repo.rootUri.toString()
	const lastHeadByRepo = new Map<string, string | undefined>();
	// Track timeout handles per repo so we can cancel/replace them
	const timeoutByRepo = new Map<string, ReturnType<typeof setTimeout>>();

	// Helper to set pet back to idle or error after timeout
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
			if (hasWorkspaceErrors()) {
				setPetState('error');
			} else {
				setPetState('idle');
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
			// Show success briefly
			setPetState('success');

			// Clear then set a new one
			restorePetStateAfterTimeout(repoId);
		}

		// Always update last known head (even if undefined)
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
