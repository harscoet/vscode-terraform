import * as vscode from 'vscode';
import * as path from 'path';
import { handleAllMainFiles } from './main';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'vscode-terraform.generateInheritedVariables',
    async (textEditor: vscode.TextEditor) => {
      const activeFolderPath = path.dirname(textEditor.document.fileName);

      try {
        await handleAllMainFiles(activeFolderPath);

        vscode.window.showInformationMessage('File generated');
      } catch (err) {
        vscode.window.showErrorMessage(err.message);
      }
    },
  );

  context.subscriptions.push(disposable);
}
