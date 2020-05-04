import * as path from 'path';
import { parseTerraformFileContent } from '../file-parser';
import { mainFileOutput, kubernetesAppOutputs } from './output/file-parser';

test('parseMainFile', async () => {
  const { blocks, variableNames, lines } = await parseTerraformFileContent(
    path.join(__dirname, 'input/main.tf'),
  );

  expect(blocks).toStrictEqual(mainFileOutput.blocks);
  expect(variableNames).toStrictEqual(mainFileOutput.variableNames);
  expect(lines).toStrictEqual(mainFileOutput.lines);
});

test('parseKubernetesAppVariablesCommonFile', async () => {
  const { blocks, variableNames } = await parseTerraformFileContent(
    path.join(__dirname, 'input/kubernetes-app/variables-common.tf'),
  );

  expect(blocks).toStrictEqual(
    kubernetesAppOutputs.variablesCommonFileOutput.blocks,
  );
  expect(variableNames).toStrictEqual(
    kubernetesAppOutputs.variablesCommonFileOutput.variableNames,
  );
});

test('parseKubernetesAppVariablesDeploymentFile', async () => {
  const { blocks, variableNames } = await parseTerraformFileContent(
    path.join(__dirname, 'input/kubernetes-app/variables-deployment.tf'),
  );

  expect(blocks).toStrictEqual(
    kubernetesAppOutputs.variablesDeploymentFileOutput.blocks,
  );
  expect(variableNames).toStrictEqual(
    kubernetesAppOutputs.variablesDeploymentFileOutput.variableNames,
  );
});

test('parseKubernetesAppVariablesHpaFile', async () => {
  const { blocks, variableNames } = await parseTerraformFileContent(
    path.join(__dirname, 'input/kubernetes-app/variables-hpa.tf'),
  );

  expect(blocks).toStrictEqual(
    kubernetesAppOutputs.variablesHpaFileOutput.blocks,
  );
  expect(variableNames).toStrictEqual(
    kubernetesAppOutputs.variablesHpaFileOutput.variableNames,
  );
});

test('parseKubernetesAppVariablesServiceFile', async () => {
  const { blocks, variableNames } = await parseTerraformFileContent(
    path.join(__dirname, 'input/kubernetes-app/variables-service.tf'),
  );

  expect(blocks).toStrictEqual(
    kubernetesAppOutputs.variablesServiceFileOutput.blocks,
  );
  expect(variableNames).toStrictEqual(
    kubernetesAppOutputs.variablesServiceFileOutput.variableNames,
  );
});
