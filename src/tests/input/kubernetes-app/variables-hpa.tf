variable "hpa_enabled" {
  type    = bool
  default = false
}

variable "hpa_min_replicas" {
  type    = number
  default = 2
}

variable "hpa_max_replicas" {
  type    = number
  default = 10
}

variable "hpa_target_cpu_utilization_percentage" {
  type    = number
  default = 80
}
