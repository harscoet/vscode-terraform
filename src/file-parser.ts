import * as fs from 'fs';
import * as path from 'path';
import { readFileLineByLine } from './util';

const MODULE_NAME_REGEXP = /module\s*"(.+)"/;
const MODULE_SOURCE_REGEXP = /source\s*=\s*"(.+)"/;
const VARIABLE_REGEXP = /variable\s*"(.+)"/;
const OVERRIDE_PATTERN = '// override';

export async function parseParentModulesFromMainFile(
  filePath: string,
): Promise<Map<string, string>> {
  const modules = new Map<string, string>();
  let currentModuleName: string | null = null;

  await readFileLineByLine(filePath, (line: string) => {
    const moduleName = parseModuleName(line);

    if (moduleName) {
      currentModuleName = moduleName;
    } else if (currentModuleName) {
      const moduleSource = parseModuleSource(line);

      if (moduleSource) {
        modules.set(currentModuleName, moduleSource);
      }
    }
  });

  return modules;
}

export async function parseRedifinedVariablesFromGeneratedFile(
  filePath: string,
): Promise<Map<string, string[]>> {
  return parseVariablesFromFile(filePath, true);
}

export async function findAndParseParentModuleVariablesFiles(
  absoluteChildModuleFolderPath: string,
  relativeParentModuleFolderPath: string,
): Promise<
  Array<{
    relativeFilePath: string;
    variables: Map<string, string[]>;
  }>
> {
  const absoluteParentModuleFolderPath = path.resolve(
    absoluteChildModuleFolderPath,
    relativeParentModuleFolderPath,
  );

  const fileNames: string[] = (
    await fs.promises.readdir(absoluteParentModuleFolderPath)
  ).filter((x) => x.startsWith('variables'));

  return (
    await Promise.all(
      fileNames.map((x) =>
        parseVariablesFromFile(path.join(absoluteParentModuleFolderPath, x)),
      ),
    )
  ).map((variables, i) => ({
    relativeFilePath: path.join(relativeParentModuleFolderPath, fileNames[i]),
    variables,
  }));
}

async function parseVariablesFromFile(
  filePath: string,
  filterOnOverride: boolean = false,
): Promise<Map<string, string[]>> {
  const variables = new Map<string, string[]>();
  let currentVariableName: string | null = null;
  let isOverride = !filterOnOverride;

  await readFileLineByLine(
    filePath,
    (line: string) => {
      if (filterOnOverride && line.startsWith(OVERRIDE_PATTERN)) {
        isOverride = true;
      } else {
        const variableName = parseVariableName(line);

        if (variableName && isOverride) {
          isOverride = !filterOnOverride;
          currentVariableName = variableName;

          variables.set(
            variableName,
            filterOnOverride ? [OVERRIDE_PATTERN, line] : [line],
          );
        } else if (currentVariableName) {
          variables.set(
            currentVariableName,
            (variables.get(currentVariableName) ?? []).concat(line),
          );

          if (line.trim() === '}') {
            currentVariableName = null;
          }
        }
      }
    },
    {
      skipEmptyLines: true,
    },
  );

  return variables;
}

function parseVariableName(text: string): string | null {
  return parseText(text, VARIABLE_REGEXP);
}

function parseModuleName(text: string): string | null {
  return parseText(text, MODULE_NAME_REGEXP);
}

function parseModuleSource(text: string): string | null {
  return parseText(text, MODULE_SOURCE_REGEXP);
}

function parseText(text: string, regExp: RegExp): string | null {
  const groups = regExp.exec(text);

  if (groups && groups.length > 1) {
    return groups[1];
  }

  return null;
}
