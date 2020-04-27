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

    if (!parentModules.size) {
      return reject(new Error('NO_MODULE_FOUND'));
    }

    const generatedFilePath = path.resolve(
      absoluteChildModuleFolderPath,
      GENERATED_FILE_NAME,
    );

    const [generatedFileData, parentModulesData] = await Promise.all([
      parseRedifinedVariablesFromGeneratedFile(generatedFilePath),
      Promise.all(
        Array.from(parentModules).map(
          async ([parentModuleName, relativeParentModuleFolderPath]) => ({
            parentModuleName,
            variablesByFilePath: await findAndParseParentModuleVariablesFiles(
              absoluteChildModuleFolderPath,
              relativeParentModuleFolderPath,
            ),
          }),
        ),
      ),
    ]);

    console.log(Array.from(generatedFileData));

    const stream = fs.createWriteStream(generatedFilePath, {
      encoding: 'utf8',
    });

    stream.on('finish', () => resolve(generatedFilePath));

    for (let i = 0; i < parentModulesData.length; i++) {
      const { variablesByFilePath, parentModuleName } = parentModulesData[i];
      const isLastModule = i === parentModulesData.length - 1;

      for (let j = 0; j < variablesByFilePath.length; j++) {
        const { relativeFilePath, variables } = variablesByFilePath[j];
        const isLastFile = j === variablesByFilePath.length - 1;

        streamWriteWithNewline(
          stream,
          `${GENERATED_LINE_PREFIX} ${parentModuleName} FILE ${relativeFilePath}`,
        );

        for (const [variableName, variableLines] of variables) {
          const overrideVariableLines = generatedFileData.get(variableName);

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
