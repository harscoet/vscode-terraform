import * as vscode from 'vscode';
import * as path from 'path';
import {
  parseMainFile,
  parseOverrideVariablesFromGeneratedFile,
} from './file-parser';
import {
  generateInheritedVariableFile,
  updateMainFile,
} from './file-generator';

const INHERITED_VARIABLE_FILE_NAME = 'variables-inherited.tf';
const MAIN_FILE_NAME = 'main.tf';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'vscode-terraform.generateInheritedVariables',
    async (textEditor: vscode.TextEditor) => {
      const activeFolderPath = path.dirname(textEditor.document.fileName);

      try {
        const inheritedVariableFilePath = path.resolve(
          activeFolderPath,
          INHERITED_VARIABLE_FILE_NAME,
        );

        const mainFilePath = path.resolve(activeFolderPath, MAIN_FILE_NAME);

        const [mainFile, overrideVariables] = await Promise.all([
          parseMainFile(activeFolderPath, mainFilePath),
          parseOverrideVariablesFromGeneratedFile(inheritedVariableFilePath),
        ]);

        await generateInheritedVariableFile(
          inheritedVariableFilePath,
          overrideVariables,
          mainFile.modules,
        );

        await updateMainFile(mainFile);

        vscode.window.showInformationMessage(
          `File ${inheritedVariableFilePath} generated`,
        );
      } catch (err) {
        vscode.window.showErrorMessage(err.message);
      }
    },
  );

  context.subscriptions.push(disposable);
}
