import * as fs from 'fs';
import * as path from 'path';
import { TerraformFile } from './types';
import {
  GENERATED_DELIMITER_PREFIX,
  USER_COMMENT_PREFIX,
  OVERRIDE_DECORATOR,
  TERRAFORM_FILE_EXTENSION,
  NEWLINE,
} from './constants';

const A_AFTER_B = 1;
const A_BEFORE_B = -1;

export async function generateMainFile(
  mainFile: TerraformFile,
  moduleVariableFiles: Map<string, TerraformFile[]>,
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
      const variableFiles = moduleVariableFiles.get(
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
              return A_AFTER_B;
            } else if (!a.isCommented && b.isCommented) {
              return A_BEFORE_B;
            } else if (a.lines.length && !b.lines.length) {
              return A_BEFORE_B;
            } else if (!a.lines.length && b.lines.length) {
              return A_AFTER_B;
            }

            return 0;
          });

          writeWithNewline();

          const fileNameParts = path
            .basename(filePath)
            .replace('.tf', '')
            .split('-');

          if (fileNameParts.length > 1) {
            writeWithNewline(
              `  ${GENERATED_DELIMITER_PREFIX} ${fileNameParts[1]}`,
            );
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

export async function generateInheritedVariableFile(
  filePath: string,
  mainFileContent: TerraformFile.Content,
  inheritedVariableFileContent: TerraformFile.Content | null,
  moduleVariableFiles: Map<string, TerraformFile[]>,
): Promise<void> {
  const { writeWithNewline, done } = writeFileLineByLine(filePath);
  let i = 0;

  for (const [moduleName, module] of mainFileContent.blocks.modules) {
    i++;
    const isLastModule = i === mainFileContent.blocks.modules.size;
    const variableFiles = moduleVariableFiles.get(moduleName) ?? [];

    for (let j = 0; j < variableFiles.length; j++) {
      const {
        filePath,
        content: { blocks },
      } = variableFiles[j];

      const isLastFile = j === variableFiles.length - 1;

      const filteredVariables = Array.from(blocks.variables).filter(
        ([variableName]) => {
          const { isCommented } =
            module.attributes.variables.get(variableName) ?? {};

          return (
            isCommented === undefined ||
            mainFileContent.variableNames.has(variableName)
          );
        },
      );

      if (!filteredVariables.length) {
        continue;
      }

      writeWithNewline(
        `${GENERATED_DELIMITER_PREFIX} MODULE ${moduleName} FILE ${path.join(
          module.attributes.source,
          path.basename(filePath, TERRAFORM_FILE_EXTENSION),
        )}`,
      );

      for (const [variableName, variable] of filteredVariables) {
        const overrideVariable = inheritedVariableFileContent?.blocks.variables.get(
          variableName,
        );

        if (overrideVariable && overrideVariable.isOverride) {
          writeWithNewline(OVERRIDE_DECORATOR);
        }

        writeWithNewline(`variable "${variableName}" {`);
        writeWithNewline(...(overrideVariable?.lines ?? variable.lines));
        writeWithNewline('}');
      }

      if (!(isLastModule && isLastFile)) {
        writeWithNewline();
      }
    }
  }

  return done();
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
