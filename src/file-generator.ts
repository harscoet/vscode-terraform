import * as path from 'path';
import { MainFile, Module, Variables } from './types';
import { writeFileLineByLine } from './file-util';
import { GENERATED_DELIMITER_PREFIX, USER_COMMENT_PREFIX } from './constants';

export async function updateMainFile(mainFile: MainFile) {
  const { filePath, lines, modules } = mainFile;
  const { writeWithNewline, done } = writeFileLineByLine(filePath);

  for (let i = 0; i < lines.length; i++) {
    const { value, contextModuleName, isModuleEndLine } = lines[i];

    writeWithNewline(value);

    if (isModuleEndLine && contextModuleName) {
      const module = modules.get(contextModuleName);

      if (module) {
        const { variableAttributes, variableFiles } = module;

        for (const { fileName, variables } of variableFiles) {
          let longuestVariableNameLength: number = 0;

          const displayVariables: Array<{
            variableName: string;
            isCommented: boolean;
            variableNameDisplayLength: number;
          }> = [];

          for (const variableName of variables.keys()) {
            const { isCustom, isCommented } = variableAttributes.get(
              variableName,
            ) ?? { isCustom: false, isCommented: false };

            if (isCustom) {
              continue;
            }

            const variableNameDisplayLength = isCommented
              ? variableName.length + 2
              : variableName.length;

            if (variableNameDisplayLength > longuestVariableNameLength) {
              longuestVariableNameLength = variableNameDisplayLength;
            }

            displayVariables.push({
              variableName,
              isCommented,
              variableNameDisplayLength,
            });
          }

          writeWithNewline();

          const fileNameParts = fileName.replace('.tf', '').split('-');

          if (fileNameParts.length > 1) {
            writeWithNewline(
              `  ${GENERATED_DELIMITER_PREFIX} ${fileNameParts[1]}`,
            );
          }

          for (const {
            variableName,
            isCommented,
            variableNameDisplayLength,
          } of displayVariables.sort(
            (a, b) => Number(a.isCommented) - Number(b.isCommented),
          )) {
            const prefix = isCommented ? `  ${USER_COMMENT_PREFIX} ` : '  ';
            const spaces = ' '.repeat(
              longuestVariableNameLength - variableNameDisplayLength,
            );

            writeWithNewline(
              `${prefix}${variableName}${spaces} = var.${variableName}`,
            );
          }
        }
      }
    }
  }

  return done();
}

export async function generateInheritedVariableFile(
  filePath: string,
  overrideVariables: Variables,
  modules: Map<string, Module>,
): Promise<void> {
  const { writeWithNewline, done } = writeFileLineByLine(filePath);
  let i = 0;

  for (const [moduleName, module] of modules) {
    i++;
    const isLastModule = i === modules.size;
    const {
      variableFiles,
      source,
      variableAttributes,
      variableNamesUsedInAttributeValues,
    } = module;

    for (let j = 0; j < variableFiles.length; j++) {
      const { fileName, variables } = variableFiles[j];
      const isLastFile = j === variableFiles.length - 1;

      const filteredVariables = Array.from(variables).filter(
        ([variableName]) => {
          const { isCustom, isCommented } =
            variableAttributes.get(variableName) ?? {};

          return (
            variableNamesUsedInAttributeValues.has(variableName) ||
            (!isCustom && !isCommented)
          );
        },
      );

      if (!filteredVariables.length) {
        continue;
      }

      writeWithNewline(
        `${GENERATED_DELIMITER_PREFIX} MODULE ${moduleName} FILE ${path.join(
          source,
          fileName,
        )}`,
      );

      for (const [variableName, variableLines] of filteredVariables) {
        const overrideVariableLines = overrideVariables.get(variableName);

        writeWithNewline(...(overrideVariableLines ?? variableLines));
      }

      if (!(isLastModule && isLastFile)) {
        writeWithNewline();
      }
    }
  }

  return done();
}
