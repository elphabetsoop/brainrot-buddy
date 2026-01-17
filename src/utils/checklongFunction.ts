import * as vscode from 'vscode';
import { setPetState, showChatBubble } from '../pet/petController';

export function setupLongFunctionListener(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("brainrot-buddy");
    const LONG_FUNCTION_THRESHOLD = config.get<number>("longFunctionThreshold", 10);

    let activeEditor = vscode.window.activeTextEditor;
    let timeout: NodeJS.Timeout | undefined;
    let lastComplaintTime = 0;
    const COMPLAINT_COOLDOWN = 3000; // 3seconds between complaints

    function checkFunctionLength() {
        if (!activeEditor) return;

        const doc = activeEditor.document;
        const text = doc.getText();

        // Enhanced regex to catch so far documented:
        // - Regular functions: function foo() {}
        // - Arrow functions: const foo = () => {}
        // - Arrow functions: const foo = async () => {}
        // - Methods: foo() {}
        // - Export functions: export function foo() {}
        // - Export arrow: export const foo = () => {}
        const functionPatterns = [
            // Standard function declarations
            /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
            // Arrow functions with const/let/var
            /(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^{=]+)?(?:=>)\s*\{/g,
            // Class methods
            /(?:public|private|protected|static|\s)*\s*\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
        ];

        const functions: { start: number; end: number; lines: number; name: string }[] = [];

        // Check each pattern
        functionPatterns.forEach(regex => {
            let match;
            const patternRegex = new RegExp(regex);

            while ((match = patternRegex.exec(text)) !== null) {
                const startPos = match.index;
                const funcStart = text.indexOf('{', startPos);

                if (funcStart === -1) continue;

                // Extract function name for better feedback
                const funcNameMatch = text.substring(startPos, funcStart).match(/(?:function\s+|const\s+|let\s+|var\s+)?(\w+)/);
                const funcName = funcNameMatch ? funcNameMatch[1] : 'anonymous';

                // Find matching closing brace
                let braceCount = 1;
                let i = funcStart + 1;

                while (i < text.length && braceCount > 0) {
                    if (text[i] === '{') braceCount++;
                    if (text[i] === '}') braceCount--;
                    i++;
                }

                if (braceCount === 0) {
                    const funcEnd = i;
                    const funcText = text.substring(funcStart, funcEnd);
                    const lineCount = funcText.split('\n').length;

                    functions.push({ start: funcStart, end: funcEnd, lines: lineCount, name: funcName });
                }
            }
        });

        // Remove duplicate functions (same start position)
        const uniqueFunctions = functions.filter((func, index, self) =>
            index === self.findIndex(f => f.start === func.start)
        );

        // Check if any function is too long
        const longFunctions = uniqueFunctions.filter(f => f.lines > LONG_FUNCTION_THRESHOLD);

        if (longFunctions.length > 0) {
            const now = Date.now();
            // Only complain if cooldown period has passed
            if (now - lastComplaintTime < COMPLAINT_COOLDOWN) return;

            lastComplaintTime = now;

            // Sort by line count to get the worst offenders
            longFunctions.sort((a, b) => b.lines - a.lines);
            const longestFunc = longFunctions[0];

            const complaints = [
                `Yo "${longestFunc.name}" is ${longestFunc.lines} lines?? Touch grass fr`,
                `${longestFunc.lines}-line "${longestFunc.name}"... did ChatGPT write this?`,
                `Nah "${longestFunc.name}" at ${longestFunc.lines} lines is crazyy`,
                `Split up "${longestFunc.name}" bestie (${longestFunc.lines} lines is unhinged)`,
                longFunctions.length > 1
                    ? `Found ${longFunctions.length} long functions... we need to talk 💀`
                    : `${longestFunc.lines} lines in one function?? Seek help fr`,
            ];

            showChatBubble(complaints[Math.floor(Math.random() * complaints.length)], 5000);
            setPetState('lengthyWarning');
            setTimeout(() => {
                setPetState('idle');
            }, 3000);
            // Log for debugging
            // console.log(`[Brainrot Buddy] Found ${longFunctions.length} long function(s):`, 
            //     longFunctions.map(f => `${f.name} (${f.lines} lines)`));
        }
    }

    function triggerCheck() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(checkFunctionLength, 2000);
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerCheck();
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if (editor) {
                triggerCheck();
            }
        })
    );

    if (activeEditor) {
        triggerCheck();
    }
}