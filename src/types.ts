export interface TerraformFile {
  fileName: string;
  filePath: string;
  folderPath: string;
  content: TerraformFile.Content;
}

export namespace TerraformFile {
  export type Block = Block.Module | Block.Variable;

  export namespace Block {
    export enum Kind {
      Module,
      Variable,
    }

    export interface Module {
      kind: Block.Kind.Module;
      name: string;
      otherVariableNames: Set<string>;
      attributes: {
        source: string;
        variables: Map<string, Module.Variable>;
        name?: string; // https://www.terraform.io/docs/configuration/modules.html#multiple-instances-of-a-module
        version?: string; // https://www.terraform.io/docs/configuration/modules.html#module-versions
        count?: number; // Not used but reserved in terraform
        for_each?: any[]; // Not used but reserved in terraform
        lifecycle?: any; // Not used but reserved in terraform
      };
    }

    export namespace Module {
      export enum ReservedAttributeName {
        Source = 'source',
        Name = 'name',
        Version = 'version',
        Count = 'count',
        ForEach = 'for_each',
        lifecycle = 'lifecycle',
      }

      export interface Variable {
        isCommented: boolean;
        isCustom: boolean;
        lines: string[];
      }
    }

    export interface Variable {
      kind: Block.Kind.Variable;
      name: string;
      isOverride: boolean;
      lines: string[];
    }
  }

  export interface Content {
    lines: Content.Line[];
    blocks: Content.Blocks;
  }

  export namespace Content {
    export interface Line {
      value: string;
      bodyBlockLastLineContext?: {
        kind: Block.Kind;
        name: string;
      };
    }

    export interface Blocks {
      modules: Map<string, Block.Module>;
      variables: Map<string, Block.Variable>;
    }
  }
}
