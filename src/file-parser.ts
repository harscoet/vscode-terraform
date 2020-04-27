import * as fs from 'fs';
import * as path from 'path';
import { readFileLineByLine } from './util';

const MODULE_NAME_REGEXP = /module\s*"(.+)"/;
const MODULE_SOURCE_REGEXP = /source\s*=\s*"(.+)"/;
const MODULE_VARIABLE_REGEXP = /^\s{2}(?!source|version|count|for_each|lifecycle)\b(\w+)\s*=/;
const VARIABLE_REGEXP = /variable\s*"(.+)"/;

const OVERRIDE_PATTERN = '// override';
const CLOSING_CURLY_BRACE = '}';

export type Variables = Map<string, string[]>;

export interface VariableFile {
  fileName: string;
  variables: Variables;
}

export interface Module {
  name: string;
  source: string;
  endLineNumber: number;
  harcodedVariableNames: Set<string>;
  variableFiles: VariableFile[];
}

export async function parseOverrideVariablesFromGeneratedFile(
  filePath: string,
): Promise<Variables> {
  return parseVariableFile(filePath, true);
}

export async function findModules(
  absoluteChildModuleFolderPath: string,
  fileName: string,
): Promise<Module[]> {
  const modules = await parseModulesFromMainFile(
    path.resolve(absoluteChildModuleFolderPath, fileName),
  );

  if (!modules.length) {
    throw new Error('NO_MODULE_FOUND');
  }

  return Promise.all(
    modules.map(async (module) => ({
      ...module,
      variableFiles: await parseModuleVariableFiles(
        path.resolve(absoluteChildModuleFolderPath, module.source),
      ),
    })),
  );
}

async function parseModulesFromMainFile(filePath: string): Promise<Module[]> {
  const modules: Module[] = [];
  let currentModule: Module | null = null;

  await readFileLineByLine(
    filePath,
    (line: string, lineNumber: number) => {
      const moduleName = parseLine(line, MODULE_NAME_REGEXP);

      if (moduleName) {
        currentModule = {
          name: moduleName,
          source: '',
          endLineNumber: -1,
          harcodedVariableNames: new Set(),
          variableFiles: [],
        };
      } else if (currentModule) {
        if (line.trimRight() === CLOSING_CURLY_BRACE) {
          currentModule.endLineNumber = lineNumber;
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

async function parseModuleVariableFiles(
  absoluteModuleFolderPath: string,
): Promise<VariableFile[]> {
  const fileNames: string[] = (
    await fs.promises.readdir(absoluteModuleFolderPath)
  ).filter((x) => x.startsWith('variables'));

  return (
    await Promise.all(
      fileNames.map((x) =>
        parseVariableFile(path.join(absoluteModuleFolderPath, x)),
      ),
    )
  ).map((variables, i) => ({
    fileName: fileNames[i],
    variables,
  }));
}

async function parseVariableFile(
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
