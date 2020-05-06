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

variable "ports" {
  type = list(object({
    name           = string
    container_port = number
    service_port   = number
  }))
  default = [{
    name           = "http"
    container_port = 8080
    service_port   = 80
  }]
}

variable "config_map_env" {
  type    = map(string)
  default = null
}

variable "config_map_files" {
  type = object({
    mount_path = string
    data       = map(string)
  })
  default = null
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
