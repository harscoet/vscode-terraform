import * as fs from 'fs';
import { createInterface } from 'readline';
import {
  USER_COMMENT_PREFIX,
  OVERRIDE_DECORATOR,
  CLOSING_CURLY_BRACE,
  GENERATED_DELIMITER_PREFIX,
} from './constants';
import { TerraformFile } from './types';

const RESERVED_ATTRIBUTE_NAMES: string[] = Object.values(
  TerraformFile.Block.Module.ReservedAttributeName,
);

const BLOCK_DECLARATION_REGEXP = /(module|variable)\s*"(.+)"/;
const VARIABLE_NAME_FROM_ATTRIBUTE_VALUE_REGEXP = /var\.(\w+)/g;
const USER_COMMENT_PREFIX_REGEXP = new RegExp(`${USER_COMMENT_PREFIX}+\\s*`);

export async function parseTerraformFileContent(
  filePath: string,
): Promise<TerraformFile.Content> {
  const blocks: TerraformFile.Content.Blocks = {
    modules: new Map(),
    variables: new Map(),
  };

  let variableNames: Set<string> = new Set();
  let currentBlock: TerraformFile.Block | null = null;
  let currentModuleVariableName: string | null = null;
  let currentModuleVariable: TerraformFile.Block.Module.Variable | null = null;
  let isOverride: boolean = false;

  function appendCurrentModuleVariable() {
    if (
      currentBlock &&
      currentModuleVariable &&
      currentModuleVariableName &&
      currentBlock.kind === TerraformFile.Block.Kind.Module
    ) {
      if (isLastLineEmpty(currentModuleVariable.lines)) {
        currentModuleVariable.lines.pop();
      }

      currentBlock.attributes.variables.set(
        currentModuleVariableName,
        currentModuleVariable,
      );

      currentModuleVariableName = null;
      currentModuleVariable = null;
    }
  }

  function findAndAppendVariableNames(rawLine: string) {
    // Register variable names found in any line
    if (!rawLine.includes(USER_COMMENT_PREFIX)) {
      for (const groups of rawLine.matchAll(
        VARIABLE_NAME_FROM_ATTRIBUTE_VALUE_REGEXP,
      )) {
        const [variableName] = groups.slice(1);

        if (variableName) {
          variableNames.add(variableName);
        }
      }
    }
  }

  const lines = await readFileLineByLine(
    filePath,
    (
      rawLine: string,
      prevLine: TerraformFile.Content.Line | null,
      isEmptyLine: boolean,
    ) => {
      // Outside block body
      if (!currentBlock) {
        if (rawLine.startsWith(OVERRIDE_DECORATOR)) {
          isOverride = true;
        } else {
          const matchingBlock = initBlock(rawLine, isOverride);

          if (matchingBlock) {
            currentBlock = matchingBlock;
          } else {
            findAndAppendVariableNames(rawLine);
          }
        }

        return true;
      }
      // Closing line in block
      else if (rawLine === CLOSING_CURLY_BRACE) {
        if (currentBlock.kind === TerraformFile.Block.Kind.Module) {
          appendCurrentModuleVariable();
          blocks.modules.set(currentBlock.name, currentBlock);
        } else {
          blocks.variables.set(currentBlock.name, currentBlock);
        }

        if (prevLine) {
          prevLine.bodyBlockLastLineContext = {
            kind: currentBlock.kind,
            name: currentBlock.name,
          };
        }

        currentBlock = null;

        return true;
      }
      // Inside body module block
      else if (currentBlock.kind === TerraformFile.Block.Kind.Module) {
        if (rawLine.includes(GENERATED_DELIMITER_PREFIX)) {
          return false;
        }

        const attribute = parseLineToFindAttribute(rawLine);

        // Is first level attribute?
        if (attribute && attribute.indent === 2) {
          // Is reserved attribute name?
          if (RESERVED_ATTRIBUTE_NAMES.includes(attribute.key)) {
            appendCurrentModuleVariable();
            findAndAppendVariableNames(rawLine);

            if (
              attribute.key ===
              TerraformFile.Block.Module.ReservedAttributeName.Source
            ) {
              currentBlock.attributes.source = attribute.value.slice(1, -1);
            }

            // Keep all reserved attributes
            return true;
          }
          // Attribute is variable
          else {
            const isCommented = attribute.key.includes(USER_COMMENT_PREFIX);
            const variableName = isCommented
              ? attribute.key.replace(USER_COMMENT_PREFIX_REGEXP, '')
              : attribute.key;
            const isCustom = attribute.value !== `var.${variableName}`;

            if (isCustom) {
              findAndAppendVariableNames(rawLine);
            }

            appendCurrentModuleVariable();

            // Keep only info about commented or custom variables
            if (isCommented || isCustom) {
              currentModuleVariableName = variableName;
              currentModuleVariable = {
                isCommented,
                lines: [attribute.value],
              };
            }
          }
        } else if (currentModuleVariable) {
          if (!isEmptyLine || !isLastLineEmpty(currentModuleVariable.lines)) {
            findAndAppendVariableNames(rawLine);
            currentModuleVariable.lines.push(rawLine);
          }
        }
      }
      // Inside body variable block
      else if (currentBlock.kind === TerraformFile.Block.Kind.Variable) {
        if (!isEmptyLine) {
          currentBlock.lines.push(rawLine);
        }

        return true;
      }

      return false;
    },
  );

  return {
    lines,
    variableNames,
    blocks,
  };
}

function initBlock(
  line: string,
  isOverride: boolean,
): TerraformFile.Block | null {
  const groups = BLOCK_DECLARATION_REGEXP.exec(line);
  const [kind, name] = groups?.slice(1) ?? [];

  switch (kind) {
    case 'module':
      return {
        kind: TerraformFile.Block.Kind.Module,
        name,
        attributes: {
          source: '',
          variables: new Map(),
        },
      };
    case 'variable':
      return {
        kind: TerraformFile.Block.Kind.Variable,
        name,
        isOverride,
        lines: [],
      };
    default:
      return null;
  }
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

function readFileLineByLine(
  filePath: string,
  onLineFn: (
    line: string,
    prevLine: TerraformFile.Content.Line | null,
    isEmptyLine: boolean,
  ) => boolean,
): Promise<TerraformFile.Content.Line[]> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    const lines: TerraformFile.Content.Line[] = [];

    input.on('error', (err) => {
      return reject(err);
    });

    const rl = createInterface({
      input,
    });

    rl.on('line', (rawLine: string) => {
      const prevLine = lines.length ? lines[lines.length - 1] : null;

      if (onLineFn(rawLine.trimRight(), prevLine, rawLine.trim() === '')) {
        lines.push({
          value: rawLine,
        });
      }
    });

    rl.on('close', () => {
      return resolve(lines);
    });
  });
}

function isLastLineEmpty(lines: string[]): boolean {
  return lines.length > 0 && lines[lines.length - 1] === '';
}
