import * as fs from 'fs';
import * as path from 'path';
import { readFileLineByLine } from './file-util';
import { USER_COMMENT_PREFIX, GENERATED_DELIMITER_PREFIX } from './constants';
import { MainFile, Module, Variables, VariableFile } from './types';

const OVERRIDE_PATTERN = `${USER_COMMENT_PREFIX} override`;
const CLOSING_CURLY_BRACE = '}';
const SOURCE_ATTRIBUTE = 'source';

const RESERVED_ATTRIBUTES = [
  SOURCE_ATTRIBUTE,
  'version',
  'count',
  'for_each',
  'lifecycle',
];

const MODULE_NAME_REGEXP = /module\s*"(.+)"/;
const VARIABLE_NAME_REGEXP = /variable\s*"(.+)"/;
const VARIABLE_NAME_FROM_ATTRIBUTE_VALUE_REGEXP = /var\.(\w+)/g;
const USER_COMMENT_PREFIX_REGEXP = new RegExp(`${USER_COMMENT_PREFIX}+\\s*`);

export async function parseMainFile(
  folderPath: string,
  filePath: string,
): Promise<MainFile> {
  const modules: Module[] = [];
  const lines: MainFile.Line[] = [];
  let currentModule: Module | null = null;

  await readFileLineByLine(filePath, (lineValue: string) => {
    const isEmptyLine = lineValue.trim() === '';
    const prevLine = lines.length > 0 ? lines[lines.length - 1] : null;
    const prevLineIsEmpty = prevLine?.value.trim() === '';

    if (isEmptyLine && prevLine && prevLineIsEmpty) {
      return;
    }

    if (!currentModule) {
      const moduleName = matchRegexp(lineValue, MODULE_NAME_REGEXP);

      if (moduleName) {
        currentModule = {
          name: moduleName,
          source: '',
          variableAttributes: new Map(),
          variableNamesUsedInAttributeValues: new Set(),
          variableFiles: [],
        };
      }
    } else {
      // End module
      if (lineValue === CLOSING_CURLY_BRACE) {
        modules.push(currentModule);
        currentModule = null;
        lines[lines.length - 1].isModuleEndLine = true;
      }
      // Generated delimiters
      else if (lineValue.includes(GENERATED_DELIMITER_PREFIX)) {
        lines.pop();
        return;
      }
      // Module body attributes
      else {
        const attribute = parseLineToFindAttribute(lineValue);

        if (attribute) {
          if (attribute.key === SOURCE_ATTRIBUTE) {
            currentModule.source = attribute.value.slice(1, -1);
          } else if (
            !RESERVED_ATTRIBUTES.includes(attribute.key) &&
            attribute.indent === 2
          ) {
            const isCommented = attribute.key.includes(USER_COMMENT_PREFIX);

            const variableName = isCommented
              ? attribute.key.replace(USER_COMMENT_PREFIX_REGEXP, '')
              : attribute.key;

            const isPassThroughVariable =
              attribute.value === `var.${variableName}`;

            // Ignore non commented pass-through variables, we will rewrite them at the bottom of the file
            if (!isCommented && isPassThroughVariable) {
              return;
            }

            currentModule.variableAttributes.set(variableName, {
              isCustom: !isPassThroughVariable,
              isCommented,
            });

            // Skip line
            if (isCommented && isPassThroughVariable) {
              return;
            }
          }
        }

        for (const variableNameUsedInAttributeValue of matchAllRegexp(
          lineValue,
          VARIABLE_NAME_FROM_ATTRIBUTE_VALUE_REGEXP,
        )) {
          currentModule.variableNamesUsedInAttributeValues.add(
            variableNameUsedInAttributeValue,
          );
        }
      }
    }

    lines.push({
      value: lineValue,
      contextModuleName: currentModule?.name ?? null,
    });
  });

  if (!modules.length) {
    throw new Error('NO_MODULE_FOUND');
  }

  return {
    folderPath,
    filePath,
    modules: (
      await Promise.all(
        modules.map(async (module) => ({
          ...module,
          variableFiles: await parseModuleVariableFiles(
            path.resolve(folderPath, module.source),
          ),
        })),
      )
    ).reduce((acc, value) => acc.set(value.name, value), new Map()),
    lines,
  };
}

export async function parseOverrideVariablesFromGeneratedFile(
  filePath: string,
): Promise<Variables> {
  return parseVariableFile(filePath, true);
}

async function parseModuleVariableFiles(
  folderPath: string,
): Promise<VariableFile[]> {
  const fileNames: string[] = (
    await fs.promises.readdir(folderPath)
  ).filter((x) => x.startsWith('variables'));

  return (
    await Promise.all(
      fileNames.map((x) => parseVariableFile(path.join(folderPath, x))),
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
        const variableName = matchRegexp(line, VARIABLE_NAME_REGEXP);

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

function parseLineToFindAttribute(
  line: string,
): { key: string; value: string; indent: number } | null {
  const parts = line.split('=');

  if (parts.length > 1) {
    return {
      key: parts[0].trim(),
      value: parts[1].trim(),
      indent: parts[0].search(/\S/),
    };
  }

  return null;
}

function matchRegexp(text: string, regexp: RegExp): string | null {
  const matches = regexp.exec(text);

  if (matches && matches.length > 1) {
    return matches[1];
  }

  return null;
}

function matchAllRegexp(text: string, regexp: RegExp): string[] {
  return Array.from(text.matchAll(regexp)).reduce(
    (acc, x) => acc.concat(x[1]),
    [],
  );
}
