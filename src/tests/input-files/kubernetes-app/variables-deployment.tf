variable deployment_enabled {
  type    = bool
  default = true
}

variable probe_port_index {
  type    = number
  default = 0
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

variable "command" {
  type    = list(string)
  default = null
}

variable "replicas" {
  type    = number
  default = 1
}

variable "lifecycle_pre_stop_exec_command" {
  type    = list(string)
  default = null
}

variable "dns_policy" {
  type        = string
  description = "(Optional) Set DNS policy for containers within the pod. Valid values are 'ClusterFirstWithHostNet', 'ClusterFirst', 'Default' or 'None'. DNS parameters given in DNSConfig will be merged with the policy selected with DNSPolicy. To have DNS options set along with hostNetwork, you have to specify DNS policy explicitly to 'ClusterFirstWithHostNet'. Optional: Defaults to 'ClusterFirst'"
  default     = "ClusterFirst"
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

variable "liveness_probe_enabled" {
  type    = bool
  default = true
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
variable "readiness_probe_http_get_path" {
  type    = string
  default = "/healthz"
}
variable "readiness_probe_initial_delay_seconds" {
  type    = number
  default = 10
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
