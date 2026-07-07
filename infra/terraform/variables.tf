variable "project_id" {
  description = "GCP プロジェクト ID"
  type        = string
  default     = "mottain-ai"
}

variable "region" {
  description = "デプロイ先リージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Run サービス名"
  type        = string
  default     = "mottain-ai"
}

variable "repository_id" {
  description = "Artifact Registry のリポジトリ ID"
  type        = string
  default     = "mottain-ai"
}

variable "github_repository" {
  description = "CD を許可する GitHub リポジトリ（owner/repo）"
  type        = string
  default     = "ymtdir/mottain-ai"
}

variable "allow_unauthenticated" {
  description = "Cloud Run を未認証で公開するか"
  type        = bool
  default     = true
}

variable "enable_cloud_sql" {
  description = "Cloud SQL for PostgreSQL を作成するか（必要になったら true）"
  type        = bool
  default     = true
}

variable "db_name" {
  description = "アプリが使うデータベース名"
  type        = string
  default     = "mottain_ai"
}

variable "db_tier" {
  description = "Cloud SQL のマシンタイプ"
  type        = string
  default     = "db-f1-micro"
}

variable "db_version" {
  description = "Cloud SQL の PostgreSQL バージョン"
  type        = string
  default     = "POSTGRES_16"
}
