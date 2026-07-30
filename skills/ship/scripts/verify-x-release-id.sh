#!/usr/bin/env bash
# Prove production serves at least the given commit via x-release-id.
# Pass when the live header resolves to a commit that is equal to OR a descendant
# of the minimum SHA (`git merge-base --is-ancestor MIN PROD`).
#
# Usage: verify-x-release-id.sh <production-url> [minimum-sha]
# Default minimum SHA: tip of origin/main (after fetch). For /ship after a PR merge,
# pass the PR's merge commit so a later main deploy that includes that commit still
# passes (exact tip match false-fails on concurrent merges).
#
# Env (tests / tuning):
#   VERIFY_X_RELEASE_ID_DEADLINE_SECS  poll window (default 480)
#   VERIFY_X_RELEASE_ID_SLEEP_SECS     sleep between polls (default 15)
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
	echo "usage: $0 <production-url> [minimum-sha]" >&2
	exit 2
fi

MIN="${2:-}"
if [[ -z "$MIN" ]]; then
	if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
		git fetch origin main >/dev/null 2>&1 || true
	fi
	MIN="$(git rev-parse --short=12 origin/main)"
fi

# Hex SHA only (7–40) — reject option/refspec injection into git fetch.
is_hex_sha() {
	[[ "$1" =~ ^[0-9a-fA-F]{7,40}$ ]]
}

resolve_commit() {
	local ref="$1"
	git rev-parse --verify "${ref}^{commit}" 2>/dev/null
}

# Fetch object into the local clone when missing (clone lagging main / merge OID from gh).
ensure_commit() {
	local ref="$1"
	local full
	full="$(resolve_commit "$ref")" && { printf '%s\n' "$full"; return 0; }
	is_hex_sha "$ref" || return 1
	git fetch --quiet origin "$ref" 2>/dev/null || git fetch --quiet origin main 2>/dev/null || true
	resolve_commit "$ref"
}

# True when live release-id is MIN or a descendant of MIN.
prod_satisfies_min() {
	local min="$1" got="$2"
	[[ -n "$got" && "$got" != "dev" && "$got" != *"-dirty" ]] || return 1
	is_hex_sha "$got" || return 1
	is_hex_sha "$min" || return 1
	local min_full got_full
	min_full="$(ensure_commit "$min")" || return 1
	got_full="$(ensure_commit "$got")" || return 1
	git merge-base --is-ancestor "$min_full" "$got_full"
}

deadline_secs="${VERIFY_X_RELEASE_ID_DEADLINE_SECS:-480}"
sleep_secs="${VERIFY_X_RELEASE_ID_SLEEP_SECS:-15}"
deadline=$((SECONDS + deadline_secs))
got=""
# Always attempt at least once (deadline_secs=0 → single try for hermetic tests).
while true; do
	got="$(
		curl -sSIL --max-time 20 "$URL" 2>/dev/null |
			awk -F': ' 'BEGIN{IGNORECASE=1} tolower($1)=="x-release-id"{gsub(/\r/,"",$2); print $2; exit}'
	)"
	if prod_satisfies_min "$MIN" "$got"; then
		echo "verified x-release-id=${got} at ${URL} (≥ ${MIN})"
		exit 0
	fi
	((SECONDS >= deadline)) && break
	sleep "$sleep_secs"
done

echo "FAIL: x-release-id missing, dev/dirty, or not ≥ ${MIN} at ${URL} (last got=${got:-<none>})" >&2
exit 1
