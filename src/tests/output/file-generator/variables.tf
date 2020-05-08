### common
variable "instance_name" {
  type        = string
  description = "Instance name"
}
variable "instance_name_prefix" {
  type        = string
  description = "Instance name prefix"
  default     = ""
}
variable "namespace" {
  type    = string
  default = "default"
}
variable "secret_env" {
  type    = map(string)
  default = null
}
variable "secret_files" {
  type = object({
    mount_path = string
    data       = map(string)
  })
  default = null
}

### deployment
variable "deployment_enabled" {
  type    = bool
  default = true
}
variable "image_name" {
  type        = string
  description = "Docker image name"
}
variable "image_registry" {
  type        = string
  description = "Docker image registry"
}
variable "image_tag" {
  type        = string
  description = "Docker image tag"
}
variable "image_pull_policy" {
  type    = string
  default = null
}
# override
variable "replicas" {
  type    = number
  default = 66
}
variable "dns_policy" {
  type    = string
  default = "ClusterFirst"
}
variable "tolerations" {
  type = list(object({
    key      = string
    operator = string
    value    = string
    effect   = string
  }))
  default = []
}
variable "resource_requests" {
  type = object({
    cpu    = string
    memory = string
  })
}
variable "resource_limits" {
  type = object({
    cpu    = string
    memory = string
  })
  default = null
}
variable "liveness_probe_http_get_path" {
  type    = string
  default = "/healthz"
}
variable "liveness_probe_initial_delay_seconds" {
  type    = number
  default = 10
}
variable "liveness_probe_period_seconds" {
  type    = number
  default = 10
}
variable "liveness_probe_timeout_seconds" {
  type    = number
  default = 1
}
variable "liveness_probe_success_threshold" {
  type    = number
  default = 1
}
variable "liveness_probe_failure_threshold" {
  type    = number
  default = 3
}
variable "readiness_probe_enabled" {
  type    = bool
  default = true
}
variable "readiness_probe_period_seconds" {
  type    = number
  default = 10
}
variable "readiness_probe_timeout_seconds" {
  type    = number
  default = 1
}
variable "readiness_probe_success_threshold" {
  type    = number
  default = 1
}
variable "readiness_probe_failure_threshold" {
  type    = number
  default = 3
}

### hpa
variable "hpa_enabled" {
  type    = bool
  default = false
}
variable "hpa_min_replicas" {
  type    = number
  default = 2
}
variable "hpa_target_cpu_utilization_percentage" {
  type    = number
  default = 80
}

### service
variable "service_enabled" {
  type    = bool
  default = true
}
variable "service_annotations" {
  type    = map(string)
  default = {}
}
variable "service_type" {
  type        = string
  description = "ExternalName, ClusterIP, NodePort or LoadBalancer"
  default     = "ClusterIP"
}
variable "service_cluster_ip" {
  type    = string
  default = null
}
variable "service_load_balancer_ip" {
  type    = string
  default = null
}
variable "service_port" {
  type    = number
  default = 80
}
variable "service_session_affinity" {
  type        = string
  description = "ClientIP or None"
  default     = "None"
}
