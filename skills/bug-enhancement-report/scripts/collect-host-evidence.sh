#!/usr/bin/env bash
# Snapshot host OS, CPU, memory, load, and optional app/process probes.
# Prints markdown on stdout. Never dumps the environment block (secrets).
# Usage: collect-host-evidence.sh [--include-git] [--probe 'cmd'] [--pid PID] ...
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: collect-host-evidence.sh [--include-git] [--probe COMMAND] [--pid PID] ...

Print a markdown host snapshot for a bug/enhancement report.

  --include-git    Include cwd git SHA/branch/status/origin. Off by default
                   so vendor tickets do not leak private repo identity.
  --probe COMMAND  Run COMMAND and capture stdout/stderr (repeatable).
  --pid PID        Sample CPU/memory for PID (repeatable). Uses comm=, not
                   full argv (argv often carries secrets).
  -h, --help       Show this help.

Does not print env vars, home listings, or git user.email.
USAGE
}

probes=()
pids=()
include_git=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-git)
      include_git=1
      shift
      ;;
    --probe)
      [[ $# -ge 2 ]] || { echo "--probe requires a command" >&2; exit 2; }
      probes+=("$2")
      shift 2
      ;;
    --pid)
      [[ $# -ge 2 ]] || { echo "--pid requires a PID" >&2; exit 2; }
      pids+=("$2")
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

# Prefer passwd home when the sandbox unsets HOME, so path redaction still works.
USER_HOME="${HOME:-}"
if [[ -z "$USER_HOME" ]]; then
  USER_HOME="$(cd ~ && pwd)" || USER_HOME=""
fi

# HOME=/ (root, some containers) would replace every slash and then break
# URL-userinfo stripping. Require an absolute prefix with two or more
# segments (`/Users/name`, `/home/name`).
home_prefix_ok=0
if [[ -n "$USER_HOME" && "$USER_HOME" == /*/* && "$USER_HOME" != / ]]; then
  home_prefix_ok=1
fi

redact() {
  local s="$1"
  local h="$USER_HOME"
  local out=""
  # Strip URL userinfo on the original string, before any slash rewriting.
  s="$(printf '%s' "$s" | sed -E 's#(https?://)[^/@[:space:]]+@#\1#g')"
  if [[ "$home_prefix_ok" -eq 1 ]]; then
    # Bash 3.2: ${s//$h/~} breaks because HOME contains `/`.
    while [[ "$s" == *"$h"* ]]; do
      out+="${s%%"$h"*}"~
      s="${s#*"$h"}"
    done
    s="$out$s"
  fi
  printf '%s' "$s"
}

run_or_na() {
  local label="$1"
  shift
  printf -- '- **%s:** ' "$label"
  if ! command -v "$1" >/dev/null 2>&1 && [[ "$1" != /* ]]; then
    echo "n/a (command not found: $1)"
    return 0
  fi
  local out
  if out="$("$@" 2>/dev/null)"; then
    out="$(printf '%s' "$out" | tr '\n' ' ' | sed -e 's/[[:space:]]\{1,\}/ /g' -e 's/[[:space:]]*$//')"
    out="$(redact "$out")"
    if [[ -z "$out" ]]; then
      echo "n/a (empty)"
    else
      printf '%s\n' "$out"
    fi
  else
    echo "n/a"
  fi
}

emit_fence() {
  local status="$1"
  local body="$2"
  printf '```\n'
  if [[ -n "$body" ]]; then
    printf '%s\n' "$body" | sed -n '1,40p' | while IFS= read -r line || [[ -n "$line" ]]; do
      redact "$line"
      printf '\n'
    done
  fi
  if [[ "$status" -ne 0 ]]; then
    printf '(exit %s)\n' "$status"
  elif [[ -z "$body" ]]; then
    printf '(empty)\n'
  fi
  printf '```\n'
}

section() {
  printf '\n## %s\n\n' "$1"
}

section "Host"
printf -- '- **captured:** %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
if [[ "$home_prefix_ok" -eq 1 ]]; then
  printf -- '- **path_redaction:** home prefix rewritten to ~\n'
else
  printf -- '- **path_redaction:** skipped (HOME empty or too short to rewrite safely)\n'
fi
run_or_na "uname" uname -srm

if [[ "$(uname -s)" == "Darwin" ]]; then
  run_or_na "sw_vers" sw_vers
  run_or_na "cpu" sysctl -n machdep.cpu.brand_string
  run_or_na "ncpu" sysctl -n hw.ncpu
  if command -v sysctl >/dev/null 2>&1; then
    mem_bytes="$(sysctl -n hw.memsize 2>/dev/null || true)"
    if [[ -n "${mem_bytes:-}" ]]; then
      printf -- '- **memory_bytes:** %s\n' "$mem_bytes"
    else
      printf -- '- **memory_bytes:** n/a\n'
    fi
  fi
  if command -v memory_pressure >/dev/null 2>&1; then
    mp_status=0
    mp_out="$(memory_pressure 2>/dev/null)" || mp_status=$?
    printf -- '- **memory_pressure:**\n\n'
    emit_fence "$mp_status" "$mp_out"
  fi
  run_or_na "vm_stat_free" bash -c "vm_stat | sed -n '1,8p'"
else
  if [[ -r /etc/os-release ]]; then
    printf -- '- **os-release:** %s\n' "$(redact "$(tr '\n' ' ' </etc/os-release | sed -e 's/[[:space:]]\{1,\}/ /g')")"
  else
    printf -- '- **os-release:** n/a\n'
  fi
  run_or_na "nproc" nproc
  if command -v lscpu >/dev/null 2>&1; then
    printf -- '- **cpu:** %s\n' "$(redact "$(lscpu 2>/dev/null | awk -F: '/Model name/ { gsub(/^ /,"",$2); print $2; exit }')")"
  fi
  run_or_na "free" free -h
fi

run_or_na "uptime" uptime
run_or_na "load" bash -c 'test -r /proc/loadavg && cat /proc/loadavg || sysctl -n vm.loadavg'
run_or_na "df_root" df -h /
run_or_na "df_cwd" df -h .

section "Toolchain (present only)"
command -v git >/dev/null 2>&1 && run_or_na "git" git --version
command -v gh >/dev/null 2>&1 && run_or_na "gh" gh --version
command -v glab >/dev/null 2>&1 && run_or_na "glab" glab --version
command -v node >/dev/null 2>&1 && run_or_na "node" node -v
command -v python3 >/dev/null 2>&1 && run_or_na "python3" python3 --version
command -v rustc >/dev/null 2>&1 && run_or_na "rustc" rustc --version
command -v go >/dev/null 2>&1 && run_or_na "go" go version
command -v podman >/dev/null 2>&1 && run_or_na "podman" podman --version
command -v docker >/dev/null 2>&1 && run_or_na "docker" docker --version

if [[ "$include_git" -eq 1 ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  section "Git (cwd repo)"
  run_or_na "root" git rev-parse --show-toplevel
  run_or_na "head" git rev-parse HEAD
  run_or_na "branch" git branch --show-current
  run_or_na "status" git status -sb
  run_or_na "origin" git remote get-url origin
fi

if [[ ${#probes[@]} -gt 0 ]]; then
  section "Probes"
  for cmd in "${probes[@]}"; do
    printf -- '### `%s`\n\n' "$(redact "$cmd")"
    probe_status=0
    probe_out="$(bash -lc "$cmd" 2>&1)" || probe_status=$?
    emit_fence "$probe_status" "$probe_out"
    printf '\n'
  done
fi

if [[ ${#pids[@]} -gt 0 ]]; then
  section "Process samples"
  for pid in "${pids[@]}"; do
    printf -- '### pid %s\n\n' "$pid"
    if ps -p "$pid" >/dev/null 2>&1; then
      sample_status=0
      # comm= is the process name only — full argv often carries secrets.
      sample="$(ps -o pid=,ppid=,pcpu=,pmem=,rss=,etime=,state=,comm= -p "$pid" 2>/dev/null)" || sample_status=$?
      emit_fence "$sample_status" "$sample"
    else
      printf '```\nnot running\n```\n'
    fi
    printf '\n'
  done
fi
