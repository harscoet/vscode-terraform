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
