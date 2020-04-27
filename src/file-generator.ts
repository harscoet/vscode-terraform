import * as fs from 'fs';
import * as path from 'path';
import {
  parseParentModulesFromMainFile,
  parseRedifinedVariablesFromGeneratedFile,
  findAndParseParentModuleVariablesFiles,
} from './file-parser';
import { streamWriteWithNewline } from './util';

const GENERATED_LINE_PREFIX = '# MODULE';
const GENERATED_FILE_NAME = 'variables-inherited.tf';

export async function generateFile(
  absoluteChildModuleFolderPath: string,
  fileName = 'main.tf',
) {
  return new Promise(async (resolve, reject) => {
    const parentModules = await parseParentModulesFromMainFile(
      path.resolve(absoluteChildModuleFolderPath, fileName),
    );

    if (!parentModules.length) {
      return reject(new Error('NO_MODULE_FOUND'));
    }

    const generatedFilePath = path.resolve(
      absoluteChildModuleFolderPath,
      GENERATED_FILE_NAME,
    );

    const [generatedFileVariables, parentModulesData] = await Promise.all([
      parseRedifinedVariablesFromGeneratedFile(generatedFilePath),
      Promise.all(
        parentModules.map(async (parentModule) => ({
          ...parentModule,
          variablesByFilePath: await findAndParseParentModuleVariablesFiles(
            absoluteChildModuleFolderPath,
            parentModule.source,
          ),
        })),
      ),
    ]);

    const stream = fs.createWriteStream(generatedFilePath, {
      encoding: 'utf8',
    });

    stream.on('finish', () => resolve(generatedFilePath));

    for (let i = 0; i < parentModulesData.length; i++) {
      const {
        variablesByFilePath,
        name: moduleName,
        harcodedVariableNames,
      } = parentModulesData[i];
      const isLastModule = i === parentModulesData.length - 1;

      for (let j = 0; j < variablesByFilePath.length; j++) {
        const { relativeFilePath, variables } = variablesByFilePath[j];
        const isLastFile = j === variablesByFilePath.length - 1;

        const filteredVariables = Array.from(variables).filter(
          (x) => !harcodedVariableNames.has(x[0]),
        );

        if (!filteredVariables.length) {
          continue;
        }

        streamWriteWithNewline(
          stream,
          `${GENERATED_LINE_PREFIX} ${moduleName} FILE ${relativeFilePath}`,
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
