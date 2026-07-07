terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # state はリモート（GCS）で管理する。
  # bucket は事前に手動作成しておくこと（README「ブートストラップ」参照）。
  backend "gcs" {
    bucket = "mottain-ai-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
