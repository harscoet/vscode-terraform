import * as fs from 'fs';
import * as path from 'path';
import { TerraformFile } from './types';
import {
  GENERATED_DELIMITER_PREFIX,
  USER_COMMENT_PREFIX,
  OVERRIDE_DECORATOR,
  TERRAFORM_FILE_EXTENSION,
  NEWLINE,
  SORT_A_AFTER_B,
  SORT_A_BEFORE_B,
} from './constants';

export async function generateMainFile(
  mainFile: TerraformFile,
  parentVariableFiles: Map<string, TerraformFile[]>,
) {
  const {
    filePath,
    content: { lines, blocks },
  } = mainFile;
  const { writeWithNewline, done } = writeFileLineByLine(filePath);

  for (let i = 0; i < lines.length; i++) {
    const { value, bodyBlockLastLineContext } = lines[i];

    writeWithNewline(value);

    if (
      bodyBlockLastLineContext &&
      bodyBlockLastLineContext.kind === TerraformFile.Block.Kind.Module
    ) {
      const moduleBlock = blocks.modules.get(bodyBlockLastLineContext.name);
      const variableFiles = parentVariableFiles.get(
        bodyBlockLastLineContext.name,
      );

      if (moduleBlock && variableFiles) {
        for (const variableFile of variableFiles) {
          let longuestVariableNameLength: number = 0;
          let longuestCommentedVariableNameLength: number = 0;

          const {
            filePath,
            content: {
              blocks: { variables },
            },
          } = variableFile;

          const displayVariables: Array<{
            variableName: string;
            isCommented: boolean;
            variableNameDisplayLength: number;
            lines: string[];
          }> = [];

          for (const variableName of variables.keys()) {
            const { isCommented, lines } = moduleBlock.attributes.variables.get(
              variableName,
            ) ?? { isCommented: false, lines: [] };

            if (lines.length && !isCommented) {
              continue;
            }

            const variableNameDisplayLength = isCommented
              ? variableName.length + 2
              : variableName.length;

            if (
              !isCommented &&
              variableNameDisplayLength > longuestVariableNameLength
            ) {
              longuestVariableNameLength = variableNameDisplayLength;
            } else if (
              isCommented &&
              variableNameDisplayLength > longuestCommentedVariableNameLength
            ) {
              longuestCommentedVariableNameLength = variableNameDisplayLength;
            }

            displayVariables.push({
              variableName,
              isCommented,
              variableNameDisplayLength,
              lines,
            });
          }

          const sortedDisplayVariables = displayVariables.sort((a, b) => {
            if (a.isCommented && !b.isCommented) {
              return SORT_A_AFTER_B;
            } else if (!a.isCommented && b.isCommented) {
              return SORT_A_BEFORE_B;
            } else if (a.lines.length && !b.lines.length) {
              return SORT_A_BEFORE_B;
            } else if (!a.lines.length && b.lines.length) {
              return SORT_A_AFTER_B;
            }

            return 0;
          });

          const fileName = formatVariableFileName(filePath);

          writeWithNewline();

          if (fileName) {
            writeWithNewline(`  ${GENERATED_DELIMITER_PREFIX} ${fileName}`);
          }

          for (const sortedDisplayVariable of sortedDisplayVariables) {
            const {
              variableName,
              isCommented,
              variableNameDisplayLength,
              lines,
            } = sortedDisplayVariable;

            const indentPrefix = isCommented
              ? `  ${USER_COMMENT_PREFIX} `
              : '  ';

            const spaces =
              lines.length > 1
                ? ''
                : ' '.repeat(
                    (isCommented &&
                    longuestCommentedVariableNameLength >
                      longuestVariableNameLength
                      ? longuestCommentedVariableNameLength
                      : longuestVariableNameLength) - variableNameDisplayLength,
                  );

            const prefix = `${indentPrefix}${variableName}${spaces} = `;

            if (lines.length) {
              writeWithNewline(
                ...lines.map((x, i) => (i === 0 ? `${prefix}${x}` : x)),
              );

              if (lines.length > 1) {
                writeWithNewline();
              }
            } else {
              writeWithNewline(`${prefix}var.${variableName}`);
            }
          }
        }
      }
    }
  }

  return done();
}

export async function generateChildVariableFile(
  targetFilePath: string,
  moduleBlockVariables: Map<string, TerraformFile.Block.Module.Variable>,
  variableNames: Set<string>,
  childVariableBlocks: Map<string, TerraformFile.Block.Variable>,
  parentVariableFiles: TerraformFile[],
): Promise<void> {
  const { writeWithNewline, done } = writeFileLineByLine(targetFilePath);

  for (let i = 0; i < parentVariableFiles.length; i++) {
    const variableFile = parentVariableFiles[i];
    const isLastFile = i === parentVariableFiles.length - 1;

    const filteredVariables = Array.from(
      variableFile.content.blocks.variables,
    ).filter(([variableName]) => {
      const { isCommented } = moduleBlockVariables.get(variableName) ?? {};

      return isCommented === undefined || variableNames.has(variableName);
    });

    if (!filteredVariables.length) {
      continue;
    }

    const fileName = formatVariableFileName(variableFile.filePath);

    if (fileName) {
      writeWithNewline(`${GENERATED_DELIMITER_PREFIX} ${fileName}`);
    }

    for (const [variableName, variable] of filteredVariables) {
      const overrideVariable = childVariableBlocks.get(variableName);

      if (overrideVariable && overrideVariable.isOverride) {
        writeWithNewline(OVERRIDE_DECORATOR);
      }

      writeWithNewline(`variable "${variableName}" {`);
      writeWithNewline(...(overrideVariable?.lines ?? variable.lines));
      writeWithNewline('}');
    }

    if (!isLastFile) {
      writeWithNewline();
    }
  }

  return done();
}

function formatVariableFileName(filePath: string): string | null {
  const fileNameParts = path
    .basename(filePath)
    .replace(TERRAFORM_FILE_EXTENSION, '')
    .split('-');

  if (fileNameParts.length > 1) {
    return fileNameParts[1];
  }

  return null;
}

function writeFileLineByLine(
  filePath: string,
): {
  writeWithNewline: (...chunk: string[]) => void;
  done: () => Promise<void>;
} {
  const stream = fs.createWriteStream(filePath, {
    encoding: 'utf8',
  });

  function writeWithNewline(...chunk: string[]) {
    stream.write(chunk.join(NEWLINE) + NEWLINE);
  }

  function done(): Promise<void> {
    return new Promise((resolve) => {
      stream.end(() => resolve());
    });
  }

  return {
    writeWithNewline,
    done,
  };
}
