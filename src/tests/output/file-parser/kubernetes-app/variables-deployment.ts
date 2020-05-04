import { newMapVariableBlocks } from '../../../test-util';
import { TerraformFile } from '../../../../types';

export const blocks: TerraformFile.Content.Blocks = {
  modules: new Map(),
  variables: newMapVariableBlocks({
    deployment_enabled: {
      lines: ['  type    = bool', '  default = true'],
    },
    probe_port_index: {
      lines: ['  type    = number', '  default = 0'],
    },
    image_name: {
      lines: ['  type        = string', '  description = "Docker image name"'],
    },
    image_registry: {
      lines: [
        '  type        = string',
        '  description = "Docker image registry"',
      ],
    },
    image_tag: {
      lines: ['  type        = string', '  description = "Docker image tag"'],
    },
    image_pull_policy: {
      lines: ['  type    = string', '  default = null'],
    },
    command: {
      lines: ['  type    = list(string)', '  default = null'],
    },
    replicas: {
      lines: ['  type    = number', '  default = 1'],
    },
    lifecycle_pre_stop_exec_command: {
      lines: ['  type    = list(string)', '  default = null'],
    },
    dns_policy: {
      lines: ['  type    = string', '  default = "ClusterFirst"'],
    },
    tolerations: {
      lines: [
        '  type = list(object({',
        '    key      = string',
        '    operator = string',
        '    value    = string',
        '    effect   = string',
        '  }))',
        '  default = []',
      ],
    },
    resource_requests: {
      lines: [
        '  type = object({',
        '    cpu    = string',
        '    memory = string',
        '  })',
      ],
    },
    resource_limits: {
      lines: [
        '  type = object({',
        '    cpu    = string',
        '    memory = string',
        '  })',
        '  default = null',
      ],
    },
    liveness_probe_enabled: {
      lines: ['  type    = bool', '  default = true'],
    },
    liveness_probe_http_get_path: {
      lines: ['  type    = string', '  default = "/healthz"'],
    },
    liveness_probe_initial_delay_seconds: {
      lines: ['  type    = number', '  default = 10'],
    },
    liveness_probe_period_seconds: {
      lines: ['  type    = number', '  default = 10'],
    },
    liveness_probe_timeout_seconds: {
      lines: ['  type    = number', '  default = 1'],
    },
    liveness_probe_success_threshold: {
      lines: ['  type    = number', '  default = 1'],
    },
    liveness_probe_failure_threshold: {
      lines: ['  type    = number', '  default = 3'],
    },
    readiness_probe_enabled: {
      lines: ['  type    = bool', '  default = true'],
    },
    readiness_probe_http_get_path: {
      lines: ['  type    = string', '  default = "/healthz"'],
    },
    readiness_probe_initial_delay_seconds: {
      lines: ['  type    = number', '  default = 10'],
    },
    readiness_probe_period_seconds: {
      lines: ['  type    = number', '  default = 10'],
    },
    readiness_probe_timeout_seconds: {
      lines: ['  type    = number', '  default = 1'],
    },
    readiness_probe_success_threshold: {
      lines: ['  type    = number', '  default = 1'],
    },
    readiness_probe_failure_threshold: {
      lines: ['  type    = number', '  default = 3'],
    },
  }),
};

export const variableNames = new Set<string>();
export const lines: TerraformFile.Content.Line[] = [];
