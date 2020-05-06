import { newMapVariableBlocks } from '../../../test-util';
import { TerraformFile } from '../../../../types';

export const blocks: TerraformFile.Content.Blocks = {
  modules: new Map(),
  variables: newMapVariableBlocks({
    service_enabled: {
      lines: ['  type    = bool', '  default = true'],
    },
    service_annotations: {
      lines: ['  type    = map(string)', '  default = {}'],
    },
    service_type: {
      lines: [
        '  type        = string',
        '  description = "ExternalName, ClusterIP, NodePort or LoadBalancer"',
        '  default     = "ClusterIP"',
      ],
    },
    service_cluster_ip: {
      lines: ['  type    = string', '  default = null'],
    },
    service_load_balancer_ip: {
      lines: ['  type    = string', '  default = null'],
    },
    service_port: {
      lines: ['  type    = number', '  default = 80'],
    },
    service_session_affinity: {
      lines: [
        '  type        = string',
        '  description = "ClientIP or None"',
        '  default     = "None"',
      ],
    },
  }),
};

export const variableNames = new Set<string>();
export const lines: TerraformFile.Content.Line[] = [];
