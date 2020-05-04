import { newMapVariableBlocks } from '../../../test-util';
import { TerraformFile } from '../../../../types';

export const blocks: TerraformFile.Content.Blocks = {
  modules: new Map(),
  variables: newMapVariableBlocks({
    instance_name: {
      lines: ['  type        = string', '  description = "Instance name"'],
    },
    instance_name_prefix: {
      lines: [
        '  type        = string',
        '  description = "Instance name prefix"',
        '  default     = ""',
      ],
    },
    namespace: {
      lines: ['  type    = string', '  default = "default"'],
    },
    ports: {
      lines: [
        '  type = list(object({',
        '    name           = string',
        '    container_port = number',
        '    service_port   = number',
        '  }))',
        '  default = [{',
        '    name           = "http"',
        '    container_port = 8080',
        '    service_port   = 80',
        '  }]',
      ],
    },
    config_map_env: {
      lines: ['  type    = map(string)', '  default = null'],
    },
    config_map_files: {
      lines: [
        '  type = object({',
        '    mount_path = string',
        '    data       = map(string)',
        '  })',
        '  default = null',
      ],
    },
    secret_env: {
      lines: ['  type    = map(string)', '  default = null'],
    },
    secret_files: {
      lines: [
        '  type = object({',
        '    mount_path = string',
        '    data       = map(string)',
        '  })',
        '  default = null',
      ],
    },
  }),
};

export const variableNames = new Set<string>();
export const lines: TerraformFile.Content.Line[] = [];
