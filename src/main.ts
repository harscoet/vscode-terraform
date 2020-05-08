import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { parseTerraformFileContent } from './file-parser';
import { promisify } from 'util';
import { exec } from 'child_process';
import { generateChildVariableFile, generateMainFile } from './file-generator';
import { TerraformFile } from './types';
import {
  TERRAFORM_FILE_EXTENSION,
  SORT_A_AFTER_B,
  SORT_A_BEFORE_B,
  VARIABLE_FILE_PREFIX,
  DEFAULT_VARIABLE_FILE_NAME,
  OUTPUT_FILE_PREFIX,
} from './constants';

const execPromise = promisify(exec);

type ModuleName = string;

export async function handleAllMainFiles(activeFolderPath: string) {
  const mainFileNames = (await fs.promises.readdir(activeFolderPath)).filter(
    (x) =>
      x.endsWith(TERRAFORM_FILE_EXTENSION) &&
      !x.startsWith(VARIABLE_FILE_PREFIX) &&
      !x.startsWith(OUTPUT_FILE_PREFIX),
  );

  return Promise.all(
    mainFileNames.map((x) => handleOneMainFile(activeFolderPath, x)),
  );
}

async function handleOneMainFile(
  activeFolderPath: string,
  mainFileName: string,
) {
  const mainFilePath = path.resolve(activeFolderPath, mainFileName);
  const mainFileContent = await parseTerraformFileContent(mainFilePath);

  const moduleBlocks: TerraformFile.Block.Module[] = Array.from(
    mainFileContent.blocks.modules.values(),
  );

  const parentVariableFileList = await Promise.all(
    moduleBlocks.map((x) =>
      handleOneParentModule(activeFolderPath, x, mainFileContent.variableNames),
    ),
  );

  await generateMainFile(
    {
      filePath: mainFilePath,
      content: mainFileContent,
    },
    parentVariableFileList.reduce(
      (acc, x, i) => acc.set(moduleBlocks[i].name, x),
      new Map<ModuleName, TerraformFile[]>(),
    ),
  );
}

async function handleOneParentModule(
  activeFolderPath: string,
  moduleBlock: TerraformFile.Block.Module,
  variableNames: Set<string>,
) {
  const childVariableFilePath = path.resolve(
    activeFolderPath,
    getChildVariableFileName(moduleBlock.name),
  );

  const [childVariableFileContent, parentVariableFileList] = await Promise.all([
    parseTerraformFileContent(childVariableFilePath).catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      return null;
    }),
    getParentVariableFiles(activeFolderPath, moduleBlock),
  ]);

  await generateChildVariableFile(
    childVariableFilePath,
    moduleBlock.attributes.variables,
    variableNames,
    childVariableFileContent?.blocks.variables ?? new Map(),
    parentVariableFileList ?? [],
  );

  return parentVariableFileList ?? [];
}

async function getParentVariableFiles(
  activeFolderPath: string,
  moduleBlock: TerraformFile.Block.Module,
): Promise<TerraformFile[]> {
  const absoluteSourcePath = await resolveModuleSource(
    activeFolderPath,
    moduleBlock.name,
    moduleBlock.attributes.source,
  );

  const fileNames: string[] = await fs.promises.readdir(absoluteSourcePath);

  const variableFilePaths: string[] = fileNames
    .filter((x) => x.startsWith(VARIABLE_FILE_PREFIX))
    .map((x) => path.join(absoluteSourcePath, x));

  const fileOutputs: TerraformFile.Content[] = await Promise.all(
    variableFilePaths.map((x) => parseTerraformFileContent(x)),
  );

  return fileOutputs
    .map((content, i) => ({
      filePath: variableFilePaths[i],
      content,
    }))
    .sort((a, b) => {
      if (a.filePath.endsWith(DEFAULT_VARIABLE_FILE_NAME)) {
        return SORT_A_BEFORE_B;
      } else if (b.filePath.endsWith(DEFAULT_VARIABLE_FILE_NAME)) {
        return SORT_A_AFTER_B;
      }

      return 0;
    });
}

async function resolveModuleSource(
  activeFolderPath: string,
  moduleName: string,
  moduleSource: string,
): Promise<string> {
  if (!moduleSource.startsWith('.')) {
    const pathname = url.parse(moduleSource).pathname ?? '';
    const [_, subModuleFolderPath] = pathname.split('//');

    const moduleSourceResolved = path.resolve(
      activeFolderPath,
      `.terraform/modules/${moduleName}/${subModuleFolderPath}`,
    );

    await fs.promises
      .access(moduleSourceResolved)
      .catch(() => execPromise('terraform init', { cwd: activeFolderPath }));

    return moduleSourceResolved;
  }

  return path.resolve(activeFolderPath, moduleSource);
}

function getChildVariableFileName(moduleName: string) {
  return `${VARIABLE_FILE_PREFIX}-${toKebabCase(
    moduleName,
  )}${TERRAFORM_FILE_EXTENSION}`;
}

function toKebabCase(value: string) {
  return value.replace(/_/g, '-');
}
