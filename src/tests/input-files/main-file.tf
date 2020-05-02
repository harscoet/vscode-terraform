locals {
  config_mount_path        = "/etc/config-api"
  computed_from_unused_var = var.deployment_enabled ? 1 : 0
}

module "api" {
  source  = "./kubernetes-app"
  version = "1.1.0"

  image_name                      = "api"
  command                         = ["node", "dist/api", "--config", local.config_mount_path]
  lifecycle_pre_stop_exec_command = var.graceful_shutdown ? ["sleep", "10"] : null
  liveness_probe_enabled          = false
  liveness_probe_period_seconds   = var.liveness_probe_period_seconds
  readiness_probe_http_get_path   = "/"
  # readiness_probe_initial_delay_seconds = 1
  probe_port_index = var.with_metrics_api ? 1 : 0

  ports = concat(
    [{
      name           = "http"
      container_port = 8080
      service_port   = 80
    }],
    ! var.with_metrics_api ? [] : [{
      name           = "metrics"
      container_port = 8081
      service_port   = null
    }]
  )


  config_map_files = {
    mount_path = local.config_mount_path
    data = {
      "config.yml" = var.config_file != null ? var.config_file : templatefile("${path.module}/config.yaml", {
        monitoring_disabled = false
      })
    }
  }

  config_map_env = {
    NODE_ENV         = var.node_env
    WITH_METRICS_API = var.with_metrics_api

    PG_ENABLED  = var.pg_enabled
    PG_DATABASE = var.instance_name
  }

  # hpa_max_replicas = var.hpa_max_replicas
}
