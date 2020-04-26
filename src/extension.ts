import * as vscode from 'vscode';
import * as path from 'path';
import { generateFile } from './file-generator';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'vscode-terraform.generateInheritedVariables',
    async (textEditor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      const childModuleRootFolder = path.dirname(textEditor.document.fileName);

      try {
        const generatedFilePath = await generateFile(childModuleRootFolder);

        vscode.window.showInformationMessage(
          `File ${generatedFilePath} generated`,
        );
      } catch (err) {
        vscode.window.showErrorMessage(err.message);
      }
    },
  );

  context.subscriptions.push(disposable);
}
