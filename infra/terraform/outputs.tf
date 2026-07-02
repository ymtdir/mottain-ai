output "cloud_run_url" {
  description = "Cloud Run サービスの URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry_repository" {
  description = "イメージの push 先"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}

output "workload_identity_provider" {
  description = "GitHub Actions 変数 WIF_PROVIDER に設定する値"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "GitHub Actions 変数 DEPLOYER_SA に設定する値"
  value       = google_service_account.deployer.email
}
