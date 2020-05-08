locals {
  config_mount_path        = "/etc/config-api"
  computed_from_unused_var = var.deployment_enabled ? 1 : 0
}

variable "graceful_shutdown" {
  type    = bool
  default = true
}
# override
variable "hpa_min_replicas" {
  type    = number
  default = 5
}

module "kubernetes" {
  source  = "./kubernetes-app"
  version = "1.1.0"

  image_name                      = "${var.image_name}_api"
  command                         = ["node", "dist/api", "--config", local.config_mount_path]
  lifecycle_pre_stop_exec_command = var.graceful_shutdown ? ["sleep", "10"] : null
  liveness_probe_enabled          = false
  readiness_probe_http_get_path   = "/"
  probe_port_index                = var.with_metrics_api ? 1 : 0

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

  ### common
  instance_name        = var.instance_name
  instance_name_prefix = var.instance_name_prefix
  namespace            = var.namespace
  secret_env           = var.secret_env
  secret_files         = var.secret_files

  ### deployment
  deployment_enabled                   = var.deployment_enabled
  image_registry                       = var.image_registry
  image_tag                            = var.image_tag
  image_pull_policy                    = var.image_pull_policy
  replicas                             = var.replicas
  dns_policy                           = var.dns_policy
  tolerations                          = var.tolerations
  resource_requests                    = var.resource_requests
  resource_limits                      = var.resource_limits
  liveness_probe_http_get_path         = var.liveness_probe_http_get_path
  liveness_probe_initial_delay_seconds = var.liveness_probe_initial_delay_seconds
  liveness_probe_period_seconds        = var.liveness_probe_period_seconds
  liveness_probe_timeout_seconds       = var.liveness_probe_timeout_seconds
  liveness_probe_success_threshold     = var.liveness_probe_success_threshold
  liveness_probe_failure_threshold     = var.liveness_probe_failure_threshold
  readiness_probe_enabled              = var.readiness_probe_enabled
  readiness_probe_period_seconds       = var.readiness_probe_period_seconds
  readiness_probe_timeout_seconds      = var.readiness_probe_timeout_seconds
  readiness_probe_success_threshold    = var.readiness_probe_success_threshold
  readiness_probe_failure_threshold    = var.readiness_probe_failure_threshold
  # readiness_probe_initial_delay_seconds = 1

  ### hpa
  hpa_enabled                           = var.hpa_enabled
  hpa_min_replicas                      = var.hpa_min_replicas
  hpa_target_cpu_utilization_percentage = var.hpa_target_cpu_utilization_percentage
  # hpa_max_replicas                    = var.hpa_max_replicas

  ### service
  service_enabled          = var.service_enabled
  service_annotations      = var.service_annotations
  service_type             = var.service_type
  service_cluster_ip       = var.service_cluster_ip
  service_load_balancer_ip = var.service_load_balancer_ip
  service_port             = var.service_port
  service_session_affinity = var.service_session_affinity
}
