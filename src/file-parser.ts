import { readFileLineByLine, parseLineToFindAttribute } from './file-util';
import { USER_COMMENT_PREFIX, GENERATED_DELIMITER_PREFIX } from './constants';
import { TerraformFile } from './types';

const OVERRIDE_DECORATOR = `${USER_COMMENT_PREFIX} override`;
const CLOSING_CURLY_BRACE = '}';
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

  let currentBlock: TerraformFile.Block | null = null;
  let isOverride: boolean = false;

  const lines = await readFileLineByLine(
    filePath,
    (rawLine: string, prevLine: TerraformFile.Content.Line | null) => {
      // Outside block body
      if (!currentBlock) {
        if (rawLine.startsWith(OVERRIDE_DECORATOR)) {
          isOverride = true;
          return false;
        }

        const matchingBlock = initBlock(rawLine, isOverride);

        if (matchingBlock) {
          currentBlock = matchingBlock;
        }
      }
      // Closing line in block
      else if (rawLine === CLOSING_CURLY_BRACE) {
        if (currentBlock.kind === TerraformFile.Block.Kind.Module) {
          blocks.modules.set(currentBlock.name, currentBlock);

          if (prevLine) {
            prevLine.bodyBlockLastLineContext = {
              kind: currentBlock.kind,
              name: currentBlock.name,
            };
          }

          currentBlock = null;
        } else {
          blocks.variables.set(currentBlock.name, currentBlock);
          currentBlock = null;

          return false;
        }
      }
      // Empty/Generated lines inside block bodies
      else if (
        rawLine.trim() === '' ||
        rawLine.includes(GENERATED_DELIMITER_PREFIX)
      ) {
        return false;
      }
      // Inside body module block
      else if (currentBlock.kind === TerraformFile.Block.Kind.Module) {
        const attribute = parseLineToFindAttribute(rawLine);

        // Is first level attribute?
        if (attribute && attribute.indent === 2) {
          // Is reserved attribute name or variable?
          if (RESERVED_ATTRIBUTE_NAMES.includes(attribute.key)) {
            if (
              attribute.key ===
              TerraformFile.Block.Module.ReservedAttributeName.Source
            ) {
              currentBlock.attributes.source = attribute.value.slice(1, -1);
            }
          }
          // Attribute is variable
          else {
            const isCommented = attribute.key.includes(USER_COMMENT_PREFIX);

            const variableName = isCommented
              ? attribute.key.replace(USER_COMMENT_PREFIX_REGEXP, '')
              : attribute.key;

            const isPassThroughVariable =
              attribute.value === `var.${variableName}`;

            // Ignore non commented pass-through variables
            if (!isCommented && isPassThroughVariable) {
              return false;
            }

            currentBlock.attributes.variables.set(variableName, {
              isCustom: !isPassThroughVariable,
              isCommented,
              lines: [],
            });

            // Skip line
            if (isCommented && isPassThroughVariable) {
              return false;
            }
          }
        }

        // Register other variables found
        for (const groups of rawLine.matchAll(
          VARIABLE_NAME_FROM_ATTRIBUTE_VALUE_REGEXP,
        )) {
          const [variableName] = groups.slice(1);

          if (variableName) {
            currentBlock.otherVariableNames.add(variableName);
          }
        }
      }
      // Inside body variable block
      else if (currentBlock.kind === TerraformFile.Block.Kind.Variable) {
        currentBlock.lines.push(rawLine);
        return false;
      }

      return true;
    },
  );

  return {
    lines,
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
        otherVariableNames: new Set(),
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
