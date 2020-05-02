import * as fs from 'fs';
import { createInterface } from 'readline';
import { TerraformFile } from './types';

const NEWLINE = '\n';

export function readFileLineByLine(
  filePath: string,
  onLineFn: (
    line: string,
    prevLine: TerraformFile.Content.Line | null,
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

      if (onLineFn(rawLine.trimRight(), prevLine)) {
        lines.push({
          value: rawLine,
        });
      }
    });

    rl.on('close', () => {
      return resolve();
    });
  });
}

export function writeFileLineByLine(
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

export function parseLineToFindAttribute(
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
