import { TerraformFile } from '../types';

export function newMap<T>(value: { [key: string]: T }): Map<string, T> {
  return new Map(Object.keys(value).map((x) => [x, value[x]]));
}

export function newMapVariableBlocks(
  blocks: Record<string, Partial<TerraformFile.Block.Variable>>,
): Map<string, TerraformFile.Block.Variable> {
  return new Map(
    Object.keys(blocks).map((name) => {
      const { isOverride, lines } = blocks[name];

      const variableBlock: TerraformFile.Block.Variable = {
        kind: TerraformFile.Block.Kind.Variable,
        name,
        isOverride: isOverride ?? false,
        lines: lines ?? [],
      };

      return [name, variableBlock];
    }),
  );
}
