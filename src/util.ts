import { createInterface } from 'readline';
import * as fs from 'fs';

const NEWLINE = '\n';
const COMMENT_PREFIX = '//';

export function streamWriteWithNewline(
  stream: fs.WriteStream,
  ...chunk: string[]
) {
  stream.write(chunk.join(NEWLINE) + NEWLINE);
}

export function commentLines(lines: string[]) {
  return lines.map((x) => `${COMMENT_PREFIX} ${x}`);
}

export function readFileLineByLine(
  filePath: string,
  onLine: (line: string) => void,
  endDelimiter?: string,
): Promise<void> {
  return new Promise((resolve) => {
    const input = fs.createReadStream(filePath);

    input.on('error', () => {
      return resolve();
    });

    const rl = createInterface({
      input,
    });

    rl.on('line', (line) => {
      if (endDelimiter && line.startsWith(endDelimiter)) {
        rl.close();
        rl.removeAllListeners();
      } else {
        onLine(line);
      }
    });

    rl.on('close', () => {
      return resolve();
    });
  });
}
