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
      lines: ['"api"'],
    },
    command: {
      isCommented: false,
      lines: ['["node", "dist/api", "--config", local.config_mount_path]'],
    },
    lifecycle_pre_stop_exec_command: {
      isCommented: false,
      lines: ['var.graceful_shutdown ? ["sleep", "10"] : null'],
    },
    liveness_probe_enabled: {
      isCommented: false,
      lines: ['false'],
    },
    readiness_probe_http_get_path: {
      isCommented: false,
      lines: ['"/"'],
    },
    readiness_probe_initial_delay_seconds: {
      isCommented: true,
      lines: ['1'],
    },
    probe_port_index: {
      isCommented: false,
      lines: ['var.with_metrics_api ? 1 : 0'],
    },
    ports: {
      isCommented: false,
      lines: [
        'concat(',
        '    [{',
        '      name           = "http"',
        '      container_port = 8080',
        '      service_port   = 80',
        '    }],',
        '    ! var.with_metrics_api ? [] : [{',
        '      name           = "metrics"',
        '      container_port = 8081',
        '      service_port   = null',
        '    }]',
        '  )',
      ],
    },
    config_map_files: {
      isCommented: false,
      lines: [
        '{',
        '    mount_path = local.config_mount_path',
        '    data = {',
        '      "config.yml" = var.config_file != null ? var.config_file : templatefile("${path.module}/config.yaml", {',
        '        monitoring_disabled = false',
        '      })',
        '    }',
        '  }',
      ],
    },
    config_map_env: {
      isCommented: false,
      lines: [
        '{',
        '    NODE_ENV         = var.node_env',
        '    WITH_METRICS_API = var.with_metrics_api',
        '',
        '    PG_ENABLED  = var.pg_enabled',
        '    PG_DATABASE = var.instance_name',
        '  }',
      ],
    },
    hpa_max_replicas: {
      isCommented: true,
      lines: ['var.hpa_max_replicas'],
    },
  });

  const expectedBlocks: TerraformFile.Content.Blocks = {
    modules: newMap<TerraformFile.Block.Module>({
      [expectedModuleBlockName]: {
        name: expectedModuleBlockName,
        kind: TerraformFile.Block.Kind.Module,
        attributes: {
          source: './kubernetes-app',
          variables: expectedVariableAttributes,
        },
      },
    }),
    variables: new Map(),
  };

  const expectedVariableNames = new Set([
    'config_file',
    'deployment_enabled',
    'graceful_shutdown',
    'hpa_max_replicas',
    'instance_name',
    'liveness_probe_period_seconds',
    'node_env',
    'pg_enabled',
    'with_metrics_api',
  ]);

  const rawExpectedLines = [
    'locals {',
    '  config_mount_path        = "/etc/config-api"',
    '  computed_from_unused_var = var.deployment_enabled ? 1 : 0',
    '}',
    '',
    'module "api" {',
    '  source  = "./kubernetes-app"',
    '  version = "1.1.0"',
    '}',
  ];

  const expectedLines: TerraformFile.Content.Line[] = rawExpectedLines.map(
    (value, i) =>
      i === rawExpectedLines.length - 2
        ? {
            value,
            bodyBlockLastLineContext: {
              kind: TerraformFile.Block.Kind.Module,
              name: expectedModuleBlockName,
            },
          }
        : { value },
  );

  // Act
  const { blocks, variableNames, lines } = await parseTerraformFileContent(
    path.join(__dirname, 'input-files/main-file.tf'),
  );

  // Assert
  expect(blocks).toStrictEqual(expectedBlocks);
  expect(variableNames).toStrictEqual(expectedVariableNames);
  expect(lines).toStrictEqual(expectedLines);
});
