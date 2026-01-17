import * as vscode from 'vscode';

export type GitCommitResult =
    | { type: 'success'; message: string }
    | { type: 'error'; message: string };

export interface GitExtension {
    getAPI(version: number): GitAPI;
}

export interface GitAPI {
    repositories: Repository[];
}

export interface Repository {
    rootUri: vscode.Uri;
    state: RepositoryState;
}

export interface RepositoryState {
    HEAD: Branch | undefined;
    onDidChange(listener: () => void): vscode.Disposable;
}

export interface Branch {
    commit?: string;
}