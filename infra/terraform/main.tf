locals {
  github_owner = split("/", var.github_repository)[0]

  services = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
  ]
}

# 必要な API を有効化する
resource "google_project_service" "services" {
  for_each = toset(local.services)

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# コンテナイメージの置き場
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.repository_id
  format        = "DOCKER"

  depends_on = [google_project_service.services]
}

# Cloud Run の実行 SA（最小権限）
resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "Cloud Run runtime SA (${var.service_name})"
}

# 実行 SA が Vertex AI（Gemini）を呼び出せるようにする
resource "google_project_iam_member" "runtime_vertex_ai" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

# Cloud Run サービス。初回は公開プレースホルダイメージで作成し、
# 以降のイメージ更新は CD（gcloud run deploy）に任せる。
resource "google_cloud_run_v2_service" "app" {
  name                = var.service_name
  location            = var.region
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"
      ports {
        container_port = 8080
      }
    }
  }

  lifecycle {
    # イメージは CD が更新するため Terraform では追従しない
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.services]
}

# 未認証での公開
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_unauthenticated ? 1 : 0

  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---- CD 用: Workload Identity Federation + デプロイ SA ----

resource "google_service_account" "deployer" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions deployer"
}

resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# デプロイ SA が実行 SA として Cloud Run をデプロイできるようにする
resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions pool"

  depends_on = [google_project_service.services]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  # 指定 owner のリポジトリからの OIDC のみ許可する
  attribute_condition = "assertion.repository_owner == '${local.github_owner}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# 対象リポジトリの Actions からデプロイ SA へのなりすましを許可する
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# ---- DB（enable_cloud_sql = true で有効化）----

resource "google_sql_database_instance" "postgres" {
  count = var.enable_cloud_sql ? 1 : 0

  name                = "${var.service_name}-pg"
  database_version    = var.db_version
  region              = var.region
  deletion_protection = false

  settings {
    tier = var.db_tier
  }

  depends_on = [google_project_service.services]
}

resource "google_sql_database" "app" {
  count = var.enable_cloud_sql ? 1 : 0

  name     = var.db_name
  instance = google_sql_database_instance.postgres[0].name
}

# URL に埋め込むためエンコード不要な英数字のみで生成する
resource "random_password" "db" {
  count = var.enable_cloud_sql ? 1 : 0

  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  count = var.enable_cloud_sql ? 1 : 0

  name     = "app"
  instance = google_sql_database_instance.postgres[0].name
  password = random_password.db[0].result
}

# ---- Secret Manager ----

# Cloud Run 用の接続 URL（Cloud SQL unix ソケット経由）
resource "google_secret_manager_secret" "database_url" {
  count = var.enable_cloud_sql ? 1 : 0

  secret_id = "database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_url" {
  count = var.enable_cloud_sql ? 1 : 0

  secret      = google_secret_manager_secret.database_url[0].id
  secret_data = "postgresql://${google_sql_user.app[0].name}:${random_password.db[0].result}@/${google_sql_database.app[0].name}?host=/cloudsql/${google_sql_database_instance.postgres[0].connection_name}"
}

# CD のマイグレーション用（Cloud SQL Auth Proxy 経由で URL を組み立てる）
resource "google_secret_manager_secret" "database_password" {
  count = var.enable_cloud_sql ? 1 : 0

  secret_id = "database-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_password" {
  count = var.enable_cloud_sql ? 1 : 0

  secret      = google_secret_manager_secret.database_password[0].id
  secret_data = random_password.db[0].result
}

# ---- DB 関連の IAM ----

# 実行 SA: Cloud SQL への接続と DATABASE_URL の読み取り
resource "google_project_iam_member" "runtime_cloudsql" {
  count = var.enable_cloud_sql ? 1 : 0

  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_database_url" {
  count = var.enable_cloud_sql ? 1 : 0

  secret_id = google_secret_manager_secret.database_url[0].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# デプロイ SA: マイグレーション実行のための接続とパスワード読み取り
resource "google_project_iam_member" "deployer_cloudsql" {
  count = var.enable_cloud_sql ? 1 : 0

  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_secret_manager_secret_iam_member" "deployer_database_password" {
  count = var.enable_cloud_sql ? 1 : 0

  secret_id = google_secret_manager_secret.database_password[0].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.deployer.email}"
}
