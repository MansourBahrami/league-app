#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-production.sh [--check] <40-character-git-sha>

Deploys an already pushed and successfully built main commit to production.
The script does not commit or push code. It creates a database backup, rolls
the two app replicas one at a time, verifies the exact version, and rolls back
the changed service if its health check fails.

--check validates GitHub Actions and the current replica health without making
any production changes.
EOF
}

CHECK_ONLY=false
if [[ $# -eq 2 && "$1" == "--check" ]]; then
  CHECK_ONLY=true
  shift
fi

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 2
fi

TARGET_SHA="$1"
if [[ ! "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "error: pass the full 40-character commit SHA" >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

SSH_KEY="${GCAMP_SSH_KEY:-$PROJECT_ROOT/ar-gcamp-agent-privatekey.pem}"
SSH_TARGET="${GCAMP_SSH_TARGET:-ubuntu@194.5.206.14}"
REMOTE_DIR="${GCAMP_REMOTE_DIR:-/app/league}"
DOCKER_REPOSITORY="${GCAMP_DOCKER_REPOSITORY:-mansourbahrami/league-app}"
TARGET_IMAGE="$DOCKER_REPOSITORY:sha-$TARGET_SHA"
SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_TARGET")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "error: SSH key not found: $SSH_KEY" >&2
  exit 1
fi

assert_target_is_current_main() {
  local remote_main_sha
  remote_main_sha="$(git ls-remote origin refs/heads/main | awk 'NR == 1 { print $1 }')"
  if [[ "$remote_main_sha" != "$TARGET_SHA" ]]; then
    echo "error: target SHA is not the current origin/main" >&2
    echo "target:      $TARGET_SHA" >&2
    echo "origin/main: ${remote_main_sha:-unavailable}" >&2
    exit 1
  fi
}

assert_target_is_current_main
if ! git cat-file -e "$TARGET_SHA^{commit}" 2>/dev/null; then
  echo "error: target SHA does not exist in the local repository" >&2
  exit 1
fi

if command -v gh >/dev/null 2>&1; then
  run_id=""
  for attempt in $(seq 1 12); do
    run_id="$(
      gh run list --workflow deploy.yml --branch main --limit 20 \
        --json databaseId,headSha \
        --jq "map(select(.headSha == \"$TARGET_SHA\"))[0].databaseId // empty"
    )"
    [[ -n "$run_id" ]] && break
    sleep 5
  done
  if [[ -z "$run_id" ]]; then
    echo "error: no GitHub Actions image build found for $TARGET_SHA" >&2
    exit 1
  fi
  echo "Waiting for GitHub Actions run $run_id ..."
  gh run watch "$run_id" --exit-status --interval 10
else
  echo "warning: gh is unavailable; Docker pull will verify image availability" >&2
fi

read_health() {
  local port="$1"
  "${SSH[@]}" "curl --fail --silent --show-error http://127.0.0.1:$port/api/health"
}

extract_version() {
  sed -n 's/.*"version":"\([^"]*\)".*/\1/p'
}

wait_for_version() {
  local port="$1"
  local expected_sha="$2"
  local label="$3"

  "${SSH[@]}" "
    expected_sha='$expected_sha'
    for attempt in \$(seq 1 40); do
      health=\$(curl --fail --silent http://127.0.0.1:$port/api/health 2>/dev/null || true)
      if printf '%s' \"\$health\" | grep -Fq '\"status\":\"ok\"' \
        && printf '%s' \"\$health\" | grep -Fq \"\\\"version\\\":\\\"\$expected_sha\\\"\"; then
        printf '%s\n' \"\$health\"
        exit 0
      fi
      sleep 3
    done
    echo 'error: $label did not become healthy on version $expected_sha' >&2
    exit 1
  "
}

set_service_image() {
  local service="$1"
  local image="$2"
  "${SSH[@]}" "
    cd '$REMOTE_DIR'
    export APP_IMAGE='$image'
    sudo -E docker compose up -d --no-deps --force-recreate '$service'
  "
}

app_health="$(read_health 3000)"
replica_health="$(read_health 3001)"
current_app_sha="$(printf '%s' "$app_health" | extract_version)"
current_replica_sha="$(printf '%s' "$replica_health" | extract_version)"

if [[ ! "$current_app_sha" =~ ^[0-9a-f]{40}$ || "$current_app_sha" != "$current_replica_sha" ]]; then
  echo "error: replicas are not on one identifiable version; aborting" >&2
  echo "app health:     $app_health" >&2
  echo "replica health: $replica_health" >&2
  exit 1
fi

if [[ "$CHECK_ONLY" == true ]]; then
  echo "Preflight check passed"
  echo "Current version: $current_app_sha"
  echo "Target version:  $TARGET_SHA"
  exit 0
fi

if [[ "$current_app_sha" == "$TARGET_SHA" ]]; then
  echo "Production is already on $TARGET_SHA"
  exit 0
fi

PREVIOUS_IMAGE="$DOCKER_REPOSITORY:sha-$current_app_sha"
echo "Current version: $current_app_sha"
echo "Target version:  $TARGET_SHA"

# The image build and health preflight can take several minutes. Refuse to
# mutate production if main moved while those checks were running.
assert_target_is_current_main

echo "Creating and validating the pre-deploy database backup ..."
"${SSH[@]}" "$REMOTE_DIR/backup-production.sh"

echo "Pulling $TARGET_IMAGE ..."
"${SSH[@]}" "
  cd '$REMOTE_DIR'
  export APP_IMAGE='$TARGET_IMAGE'
  sudo -E docker compose pull app app-replica
"

echo "Rolling app ..."
if ! set_service_image app "$TARGET_IMAGE"; then
  echo "App recreation failed; restoring app on $current_app_sha" >&2
  set_service_image app "$PREVIOUS_IMAGE" || true
  wait_for_version 3000 "$current_app_sha" app || true
  exit 1
fi
if ! wait_for_version 3000 "$TARGET_SHA" app; then
  echo "App health failed; rolling app back to $current_app_sha" >&2
  set_service_image app "$PREVIOUS_IMAGE" || true
  wait_for_version 3000 "$current_app_sha" app || true
  exit 1
fi

echo "Rolling app-replica ..."
if ! set_service_image app-replica "$TARGET_IMAGE"; then
  echo "Replica recreation failed; rolling both services back to $current_app_sha" >&2
  set_service_image app-replica "$PREVIOUS_IMAGE" || true
  wait_for_version 3001 "$current_app_sha" app-replica || true
  set_service_image app "$PREVIOUS_IMAGE" || true
  wait_for_version 3000 "$current_app_sha" app || true
  exit 1
fi
if ! wait_for_version 3001 "$TARGET_SHA" app-replica; then
  echo "Replica health failed; rolling both services back to $current_app_sha" >&2
  set_service_image app-replica "$PREVIOUS_IMAGE" || true
  wait_for_version 3001 "$current_app_sha" app-replica || true
  set_service_image app "$PREVIOUS_IMAGE" || true
  wait_for_version 3000 "$current_app_sha" app || true
  exit 1
fi

echo "Checking the public CDN path ..."
public_health="$(curl --fail --silent --show-error https://app.gcamp.ir/api/health)"
if ! printf '%s' "$public_health" | grep -Fq "\"version\":\"$TARGET_SHA\""; then
  echo "error: origin is healthy but the public endpoint did not report the target SHA" >&2
  echo "$public_health" >&2
  exit 1
fi

printf '%s\n' "$public_health"
echo "Deployment complete: $TARGET_SHA"
