import * as fs from 'fs';
import * as path from 'path';
import { readFileLineByLine } from './util';

const MODULE_NAME_REGEXP = /module\s*"(.+)"/;
const MODULE_SOURCE_REGEXP = /source\s*=\s*"(.+)"/;
const VARIABLE_REGEXP = /variable\s*"(.+)"/;

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
  delimiter: string,
): Promise<{ lines: string[]; variableNames: Set<string> }> {
  const lines: string[] = [];
  const variableNames = new Set<string>();

  await readFileLineByLine(
    filePath,
    (line: string) => {
      lines.push(line);
      const variableName = parseVariable(line);

      if (variableName) {
        variableNames.add(variableName);
      }
    },
    delimiter,
  );

  return {
    lines,
    variableNames,
  };
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
        parseVariablesFromParentModuleFile(
          path.join(absoluteParentModuleFolderPath, x),
        ),
      ),
    )
  ).map((variables, i) => ({
    relativeFilePath: path.join(relativeParentModuleFolderPath, fileNames[i]),
    variables,
  }));
}

async function parseVariablesFromParentModuleFile(
  filePath: string,
): Promise<Map<string, string[]>> {
  const variables = new Map<string, string[]>();
  let currentVariableName: string | null = null;

  await readFileLineByLine(filePath, (line: string) => {
    const variableName = parseVariable(line);

    if (variableName) {
      currentVariableName = variableName;
      variables.set(variableName, [line]);
    } else if (currentVariableName && line.trim()) {
      variables.set(
        currentVariableName,
        (variables.get(currentVariableName) ?? []).concat(line),
      );
    }
  });

  return variables;
}

function parseVariable(text: string): string | null {
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
