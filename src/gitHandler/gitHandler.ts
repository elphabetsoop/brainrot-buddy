import * as vscode from 'vscode';
import { GitAPI, GitCommitResult, GitExtension, Repository } from './type';

export class GitHandler {
    private git?: GitAPI;
    private lastCommits: Record<string, string | undefined> = {};
    private repoDisposables: Map<string, vscode.Disposable> = new Map();

    // single flag preventing re-registering of workspace listener multiple times
    private workspaceListenerDisposable?: vscode.Disposable;

    constructor(
        private readonly onCommitResult: (result: GitCommitResult) => void
    ) { }

    //init
    public init(context: vscode.ExtensionContext): void {
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension) {
            // not installed/enabled — nothing to do
            return;
        }

        this.git = gitExtension.exports.getAPI(1);

        // subscribe to existing repos
        this.subscribeToRepos(context);

        // watch for workspace folder changes (new folders/opened up)
        if (!this.workspaceListenerDisposable) {
            this.workspaceListenerDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
                this.subscribeToRepos(context);
            });
            context.subscriptions.push(this.workspaceListenerDisposable);
        }
    }

    // subscribe to repo not yet tracked, and remove disposables for repos that no longer exist.
    private subscribeToRepos(context: vscode.ExtensionContext): void {
        if (!this.git) return;

        const currentRepoIds = new Set<string>();
        for (const repo of this.git.repositories) {
            const repoId = repo.rootUri.toString();
            currentRepoIds.add(repoId);

            if (this.repoDisposables.has(repoId)) {
                // already tracked
                continue;
            }

            // initialize last commit for this repo
            this.lastCommits[repoId] = repo.state.HEAD?.commit;

            // subscribe to state changes for this repo
            const disp = repo.state.onDidChange(() => {
                this.handleRepoChange(repo);
            });

            // store disposable so we can clean up later
            this.repoDisposables.set(repoId, disp);
            context.subscriptions.push(disp);
        }

        // clean up disposables for repos that were removed
        for (const trackedRepoId of Array.from(this.repoDisposables.keys())) {
            if (!currentRepoIds.has(trackedRepoId)) {
                const d = this.repoDisposables.get(trackedRepoId);
                if (d) {
                    d.dispose();
                }
                this.repoDisposables.delete(trackedRepoId);
                delete this.lastCommits[trackedRepoId];
            }
        }
    }

    private handleRepoChange(repo: Repository): void {
        const repoId = repo.rootUri.toString();
        const currentCommit = repo.state.HEAD?.commit;
        const lastCommit = this.lastCommits[repoId];

        // Commit success (HEAD moved to new commit)
        if (currentCommit && currentCommit !== lastCommit) {
            this.lastCommits[repoId] = currentCommit;
            this.onCommitResult({
                type: 'success',
                message: 'Commit successful 🧠✨'
            });
            return;
        }

        if (!currentCommit && Math.random() > 0.9) {
            this.onCommitResult({
                type: 'error',
                message: 'Commit failed 💀'
            });
        }
    }

    // dispose everything to clean up manually.
    public dispose(): void {
        this.repoDisposables.forEach(d => d.dispose());
        this.repoDisposables.clear();
        if (this.workspaceListenerDisposable) {
            this.workspaceListenerDisposable.dispose();
            this.workspaceListenerDisposable = undefined;
        }
    }
}
