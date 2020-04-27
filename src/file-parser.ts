import * as fs from 'fs';
import * as path from 'path';
import { readFileLineByLine } from './util';

const MODULE_NAME_REGEXP = /module\s*"(.+)"/;
const MODULE_SOURCE_REGEXP = /source\s*=\s*"(.+)"/;
const MODULE_VARIABLE_REGEXP = /^\s{2}(?!source|version|count|for_each|lifecycle)\b(\w+)\s*=/;
const VARIABLE_REGEXP = /variable\s*"(.+)"/;

const OVERRIDE_PATTERN = '// override';
const CLOSING_CURLY_BRACE = '}';

interface ParentModule {
  name: string;
  source: string;
  harcodedVariableNames: Set<string>;
}

export async function parseParentModulesFromMainFile(
  filePath: string,
): Promise<ParentModule[]> {
  const modules: ParentModule[] = [];
  let currentModule: ParentModule | null = null;

  await readFileLineByLine(
    filePath,
    (line: string) => {
      const moduleName = parseLine(line, MODULE_NAME_REGEXP);

      if (moduleName) {
        currentModule = {
          name: moduleName,
          source: '',
          harcodedVariableNames: new Set(),
        };
      } else if (currentModule) {
        if (line.trimRight() === CLOSING_CURLY_BRACE) {
          modules.push(currentModule);
          currentModule = null;
        } else {
          const moduleSource = parseLine(line, MODULE_SOURCE_REGEXP);

          if (moduleSource) {
            currentModule.source = moduleSource;
          } else {
            const variableName = parseLine(line, MODULE_VARIABLE_REGEXP);

            if (variableName) {
              currentModule.harcodedVariableNames.add(variableName);
            }
          }
        }
      }
    },
    {
      skipEmptyLines: true,
    },
  );

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
        const variableName = parseLine(line, VARIABLE_REGEXP);

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

          if (line.trimRight() === CLOSING_CURLY_BRACE) {
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

function parseLine(text: string, regExp: RegExp): string | null {
  const groups = regExp.exec(text);

  if (groups && groups.length > 1) {
    return groups[1];
  }

  return null;
}
