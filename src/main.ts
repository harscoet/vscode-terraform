import * as path from 'path';
import * as fs from 'fs';
import { parseTerraformFileContent } from './file-parser';
import {
  generateInheritedVariableFile,
  generateMainFile,
} from './file-generator';
import { TerraformFile } from './types';

const FILTER_VARIABLE_FILE_PREFIX = 'variable';

export async function run(
  activeFolderPath: string,
  mainFileName: string,
  inheritedVariableFileName: string,
) {
  const mainFilePath = path.resolve(activeFolderPath, mainFileName);

  const inheritedVariableFilePath = path.resolve(
    activeFolderPath,
    inheritedVariableFileName,
  );

  const [mainFileContent, inheritedVariableFileContent] = await Promise.all([
    parseTerraformFileContent(mainFilePath),
    parseTerraformFileContent(inheritedVariableFilePath).catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      return null;
    }),
  ]);

  if (mainFileContent) {
    const modules = Array.from(mainFileContent.blocks.modules.values());

    const flatModuleVariableFiles: TerraformFile[][] = await Promise.all(
      modules.map(async ({ attributes: { source } }) => {
        const absoluteSourcePath = path.resolve(activeFolderPath, source);
        const fileNames: string[] = await fs.promises.readdir(
          absoluteSourcePath,
        );

        const variableFilePaths: string[] = fileNames
          .filter((x) => x.startsWith(FILTER_VARIABLE_FILE_PREFIX))
          .map((x) => path.join(absoluteSourcePath, x));

        const fileOutputs: TerraformFile.Content[] = await Promise.all(
          variableFilePaths.map((x) => parseTerraformFileContent(x)),
        );

        return fileOutputs.map((content, i) => ({
          filePath: variableFilePaths[i],
          content,
        }));
      }),
    );

    const moduleVariableFiles: Map<
      string,
      TerraformFile[]
    > = flatModuleVariableFiles.reduce(
      (acc, x, i) => acc.set(modules[i].name, x),
      new Map<string, TerraformFile[]>(),
    );

    await Promise.all([
      generateInheritedVariableFile(
        inheritedVariableFilePath,
        mainFileContent,
        inheritedVariableFileContent,
        moduleVariableFiles,
      ),
      generateMainFile(
        {
          filePath: mainFilePath,
          content: mainFileContent,
        },
        moduleVariableFiles,
      ),
    ]);
  }
}
