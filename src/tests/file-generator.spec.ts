import * as fs from 'fs';
import * as path from 'path';
import {
  generateInheritedVariableFile,
  generateMainFile,
} from '../file-generator';
import { parseTerraformFileContent } from '../file-parser';
import { mainFileOutput, kubernetesAppOutputs } from './output/file-parser';
import { newMapVariableBlocks, newMap } from './test-util';
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

  await generateMainFile(
    {
      filePath: generatedFilePath,
      content: mainFileOutput,
    },
    moduleVariableFiles,
  );

  const mainFileOutputBis = await parseTerraformFileContent(generatedFilePath);
  expect(mainFileOutputBis.blocks).toStrictEqual(mainFileOutput.blocks);
});

function newVariableFile(
  fileNameSuffix: string,
  content: TerraformFile.Content,
) {
  return {
    fileName: `variables-${fileNameSuffix}`,
    filePath: `./kubernetes-app/variables-${fileNameSuffix}.tf`,
    folderPath: './kubernetes-app',
    content,
  };
}

function getFilePath(fileName: string) {
  return path.join(__dirname, `output/file-generator/${fileName}.tf`);
}
