import * as fs from 'fs';
import { createInterface } from 'readline';

const NEWLINE = '\n';

export function readFileLineByLine(
  filePath: string,
  onLineFn: (line: string, lineNumber: number) => void,
  options?: {
    endDelimiter?: string;
    skipEmptyLines?: boolean;
  },
): Promise<void> {
  return new Promise((resolve) => {
    const { endDelimiter, skipEmptyLines } = options || {};
    const input = fs.createReadStream(filePath);
    let lineNumber = 0;

    input.on('error', () => {
      return resolve();
    });

    const rl = createInterface({
      input,
    });

    rl.on('line', (line) => {
      lineNumber++;

      if (endDelimiter && line.startsWith(endDelimiter)) {
        rl.close();
        rl.removeAllListeners();
      } else if (!skipEmptyLines || line.trim() !== '') {
        onLineFn(line.trimRight(), lineNumber);
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
