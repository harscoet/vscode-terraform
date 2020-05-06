import { newMapVariableBlocks } from '../../../test-util';
import { TerraformFile } from '../../../../types';

export const blocks: TerraformFile.Content.Blocks = {
  modules: new Map(),
  variables: newMapVariableBlocks({
    hpa_enabled: {
      lines: ['  type    = bool', '  default = false'],
    },
    hpa_min_replicas: {
      lines: ['  type    = number', '  default = 2'],
    },
    hpa_max_replicas: {
      lines: ['  type    = number', '  default = 10'],
    },
    hpa_target_cpu_utilization_percentage: {
      lines: ['  type    = number', '  default = 80'],
    },
  }),
};

export const variableNames = new Set<string>();
export const lines: TerraformFile.Content.Line[] = [];
