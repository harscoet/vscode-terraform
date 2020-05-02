import * as path from 'path';
import { parseTerraformFileContent } from '../file-parser';
import { TerraformFile } from '../types';
import { newMap } from './test-util';

test('parseFile', async () => {
  // Arrange
  const expectedModuleBlockName = 'api';

  const expectedVariableAttributes = newMap<
    TerraformFile.Block.Module.Variable
  >({
    image_name: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    command: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    lifecycle_pre_stop_exec_command: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    liveness_probe_enabled: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    readiness_probe_http_get_path: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    readiness_probe_initial_delay_seconds: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    probe_port_index: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    ports: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    config_map_files: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    config_map_env: {
      isCommented: false,
      isCustom: true,
      lines: [],
    },
    hpa_max_replicas: {
      isCommented: true,
      isCustom: false,
      lines: [],
    },
  });

  const expectedBlocks: TerraformFile.Content.Blocks = {
    modules: newMap<TerraformFile.Block.Module>({
      [expectedModuleBlockName]: {
        name: expectedModuleBlockName,
        kind: TerraformFile.Block.Kind.Module,
        otherVariableNames: new Set([
          'graceful_shutdown',
          'with_metrics_api',
          'config_file',
          'node_env',
          'pg_enabled',
          'instance_name',
        ]),
        attributes: {
          source: './kubernetes-app',
          variables: expectedVariableAttributes,
        },
      },
    }),
    variables: new Map(),
  };

  // Act
  const { blocks } = await parseTerraformFileContent(
    path.join(__dirname, 'input-files/main-file.tf'),
  );

  // Assert
  expect(blocks).toStrictEqual(expectedBlocks);
});
