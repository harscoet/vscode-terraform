import * as vscode from 'vscode';
import * as path from 'path';
import { run } from './main';

const INHERITED_VARIABLE_FILE_NAME = 'variables-inherited.tf';
const MAIN_FILE_NAME = 'main.tf';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'vscode-terraform.generateInheritedVariables',
    async (textEditor: vscode.TextEditor) => {
      const activeFolderPath = path.dirname(textEditor.document.fileName);

      try {
        await run(
          activeFolderPath,
          MAIN_FILE_NAME,
          INHERITED_VARIABLE_FILE_NAME,
        );

        vscode.window.showInformationMessage(
          `File ${INHERITED_VARIABLE_FILE_NAME} generated`,
        );
      } catch (err) {
        vscode.window.showErrorMessage(err.message);
      }
    },
  );

  context.subscriptions.push(disposable);
}
