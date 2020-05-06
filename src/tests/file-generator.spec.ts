import * as fs from 'fs';
import * as path from 'path';
import {
  generateInheritedVariableFile,
  generateMainFile,
} from '../file-generator';
import { mainFileOutput, kubernetesAppOutputs } from './output/file-parser';
import { newMapVariableBlocks, newMap } from './test-util';
import { parseTerraformFileContent } from '../file-parser';
import { TerraformFile } from '../types';

const moduleVariableFiles = newMap<TerraformFile[]>({
  [mainFileOutput.moduleBlockName]: [
    newVariableFile('common', kubernetesAppOutputs.variablesCommonFileOutput),
    newVariableFile(
      'deployment',
      kubernetesAppOutputs.variablesDeploymentFileOutput,
    ),
    newVariableFile('hpa', kubernetesAppOutputs.variablesHpaFileOutput),
    newVariableFile('service', kubernetesAppOutputs.variablesServiceFileOutput),
  ],
});

test('generateInheritedVariableFile', async () => {
  const generatedFilePath = getFilePath('.variables-inherited');
  const expectedFilePath = getFilePath('variables-inherited');

  await generateInheritedVariableFile(
    generatedFilePath,
    mainFileOutput,
    {
      variableNames: new Set(),
      blocks: {
        modules: new Map(),
        variables: newMapVariableBlocks({
          replicas: {
            isOverride: true,
            lines: ['  type    = number', '  default = 66'],
          },
          image_pull_policy: {
            isOverride: false,
            lines: ['  type    = string', '  default = null'],
          },
        }),
      },
      lines: [],
    },
    moduleVariableFiles,
  );

  const [generatedFileContent, expectedFileContent] = await Promise.all(
    [generatedFilePath, expectedFilePath].map((x) =>
      fs.promises.readFile(x, {
        encoding: 'utf8',
      }),
    ),
  );

  expect(generatedFileContent).toEqual(expectedFileContent);
});

test('generateMainFile', async () => {
  const generatedFilePath = getFilePath('.main');

  const [expectedFileContent] = await Promise.all([
    fs.promises.readFile(getFilePath('main'), {
      encoding: 'utf8',
    }),
    generateMainFile(
      {
        filePath: generatedFilePath,
        content: mainFileOutput,
      },
      moduleVariableFiles,
    ),
  ]);

  const [generatedFileContent, mainFileOutputBis] = await Promise.all([
    fs.promises.readFile(generatedFilePath, {
      encoding: 'utf8',
    }),
    parseTerraformFileContent(generatedFilePath),
  ]);

  // Regenerate same file
  await generateMainFile(
    {
      filePath: generatedFilePath,
      content: mainFileOutputBis,
    },
    moduleVariableFiles,
  );

  const generatedFileContentBis = await fs.promises.readFile(
    generatedFilePath,
    {
      encoding: 'utf8',
    },
  );

  expect(mainFileOutputBis.variableNames).toStrictEqual(
    mainFileOutput.variableNames,
  );

  for (const [moduleName, module] of mainFileOutputBis.blocks.modules) {
    expect(module.attributes.variables).toEqual(
      mainFileOutput.blocks.modules.get(moduleName)?.attributes.variables,
    );
  }

  expect(generatedFileContent).toEqual(expectedFileContent);
  expect(generatedFileContentBis).toEqual(expectedFileContent);
});

function newVariableFile(
  fileNameSuffix: string,
  content: TerraformFile.Content,
): TerraformFile {
  return {
    filePath: `./kubernetes-app/variables-${fileNameSuffix}.tf`,
    content,
  };
}

function getFilePath(fileName: string) {
  return path.join(__dirname, `output/file-generator/${fileName}.tf`);
}
