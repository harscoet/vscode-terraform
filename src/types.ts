export type Variables = Map<string, string[]>;

export interface VariableFile {
  fileName: string;
  variables: Variables;
}

export interface Module {
  name: string;
  source: string;
  variableAttributes: Map<
    string,
    {
      isCommented: boolean;
      isCustom: boolean;
    }
  >;
  variableNamesUsedInAttributeValues: Set<string>;
  variableFiles: VariableFile[];
}

export interface MainFile {
  folderPath: string;
  filePath: string;
  modules: Map<string, Module>;
  lines: MainFile.Line[];
}

export namespace MainFile {
  export interface Line {
    value: string;
    isModuleEndLine?: boolean;
    contextModuleName: string | null;
  }
}
