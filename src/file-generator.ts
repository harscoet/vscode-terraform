import * as fs from 'fs';
import * as path from 'path';
import {
  findModules,
  parseOverrideVariablesFromGeneratedFile,
  Module,
} from './file-parser';
import { streamWriteWithNewline } from './util';

const GENERATED_LINE_PREFIX = '# MODULE';
const GENERATED_FILE_NAME = 'variables-inherited.tf';

export async function generateFile(
  absoluteChildModuleFolderPath: string,
  fileName = 'main.tf',
): Promise<{ generatedFilePath: string; modules: Module[] }> {
  return new Promise(async (resolve) => {
    const generatedFilePath = path.resolve(
      absoluteChildModuleFolderPath,
      GENERATED_FILE_NAME,
    );

    const [generatedFileVariables, modules] = await Promise.all([
      parseOverrideVariablesFromGeneratedFile(generatedFilePath),
      findModules(absoluteChildModuleFolderPath, fileName),
    ]);

    const stream = fs.createWriteStream(generatedFilePath, {
      encoding: 'utf8',
    });

    stream.on('finish', () => resolve({ generatedFilePath, modules }));

    for (let i = 0; i < modules.length; i++) {
      const {
        variableFiles,
        source,
        name: moduleName,
        harcodedVariableNames,
      } = modules[i];

      const isLastModule = i === modules.length - 1;

      for (let j = 0; j < variableFiles.length; j++) {
        const { fileName, variables } = variableFiles[j];
        const isLastFile = j === variableFiles.length - 1;

        const filteredVariables = Array.from(variables).filter(
          (x) => !harcodedVariableNames.has(x[0]),
        );

        if (!filteredVariables.length) {
          continue;
        }

        streamWriteWithNewline(
          stream,
          `${GENERATED_LINE_PREFIX} ${moduleName} FILE ${path.join(
            source,
            fileName,
          )}`,
        );

        for (const [variableName, variableLines] of filteredVariables) {
          const overrideVariableLines = generatedFileVariables.get(
            variableName,
          );

          streamWriteWithNewline(
            stream,
            ...(overrideVariableLines ?? variableLines),
          );
        }

        if (!(isLastModule && isLastFile)) {
          streamWriteWithNewline(stream);
        }
      }
    }

    stream.end();
  });
}
