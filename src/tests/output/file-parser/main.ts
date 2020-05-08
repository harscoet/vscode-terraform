import { newMap, newMapVariableBlocks } from '../../test-util';
import { TerraformFile } from '../../../types';

export const moduleBlockName = 'kubernetes';

const variableAttributes = newMap<TerraformFile.Block.Module.Variable>({
  image_name: {
    isCommented: false,
    lines: ['"${var.image_name}_api"'],
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

export const blocks: TerraformFile.Content.Blocks = {
  modules: newMap<TerraformFile.Block.Module>({
    [moduleBlockName]: {
      name: moduleBlockName,
      kind: TerraformFile.Block.Kind.Module,
      attributes: {
        source: './kubernetes-app',
        variables: variableAttributes,
      },
    },
  }),
  variables: newMapVariableBlocks({
    graceful_shutdown: {
      lines: ['  type    = bool', '  default = true'],
    },
    hpa_min_replicas: {
      isOverride: true,
      lines: ['  type    = number', '  default = 5'],
    },
  }),
};

export const variableNames = new Set([
  'config_file',
  'deployment_enabled',
  'graceful_shutdown',
  'image_name',
  'instance_name',
  'node_env',
  'pg_enabled',
  'with_metrics_api',
]);

export const lines: TerraformFile.Content.Line[] = [
  'locals {',
  '  config_mount_path        = "/etc/config-api"',
  '  computed_from_unused_var = var.deployment_enabled ? 1 : 0',
  '}',
  '',
  'variable "graceful_shutdown" {',
  '  type    = bool',
  {
    value: '  default = true',
    bodyBlockLastLineContext: {
      kind: TerraformFile.Block.Kind.Variable,
      name: 'graceful_shutdown',
    },
  },
  '}',
  '# override',
  'variable "hpa_min_replicas" {',
  '  type    = number',
  {
    value: '  default = 5',
    bodyBlockLastLineContext: {
      kind: TerraformFile.Block.Kind.Variable,
      name: 'hpa_min_replicas',
    },
  },
  '}',
  '',
  'module "kubernetes" {',
  '  source  = "./kubernetes-app"',
  '  version = "1.1.0"',
  '',
  '  image_name                      = "${var.image_name}_api"',
  '  command                         = ["node", "dist/api", "--config", local.config_mount_path]',
  '  lifecycle_pre_stop_exec_command = var.graceful_shutdown ? ["sleep", "10"] : null',
  '  liveness_probe_enabled          = false',
  '  readiness_probe_http_get_path   = "/"',
  '  probe_port_index                = var.with_metrics_api ? 1 : 0',
  '',
  '  ports = concat(',
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
  '',
  '  config_map_files = {',
  '    mount_path = local.config_mount_path',
  '    data = {',
  '      "config.yml" = var.config_file != null ? var.config_file : templatefile("${path.module}/config.yaml", {',
  '        monitoring_disabled = false',
  '      })',
  '    }',
  '  }',
  '',
  '  config_map_env = {',
  '    NODE_ENV         = var.node_env',
  '    WITH_METRICS_API = var.with_metrics_api',
  '',
  '    PG_ENABLED  = var.pg_enabled',
  '    PG_DATABASE = var.instance_name',
  {
    value: '  }',
    bodyBlockLastLineContext: {
      kind: TerraformFile.Block.Kind.Module,
      name: moduleBlockName,
    },
  },
  '}',
].map((value) => (typeof value === 'string' ? { value } : value));
