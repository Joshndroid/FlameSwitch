#!/bin/sh
set -eu

dockerfile=${1:-.docker/Dockerfile}
compose_file=.docker/docker-compose.yml
service_dir=root/etc/s6-overlay/s6-rc.d/svc-flame

fail() {
  echo "LinuxServer container contract failed: $*" >&2
  exit 1
}

runtime_base=$(awk 'toupper($1) == "FROM" { image = $2 } END { print image }' "$dockerfile")
case "$runtime_base" in
  lscr.io/linuxserver/baseimage-*:*) ;;
  *) fail "the final image must use an lscr.io/linuxserver/baseimage-* image (found $runtime_base)" ;;
esac

if ! awk '
  toupper($1) == "FROM" { copies_service = 0; next }
  toupper($1) == "COPY" && $2 == "root/" && $3 == "/" { copies_service = 1 }
  END { exit copies_service ? 0 : 1 }
' "$dockerfile"; then
  fail "the final stage must copy the s6-overlay service definitions from root/"
fi

if awk '
  toupper($1) == "FROM" { bypasses_s6 = 0; next }
  toupper($1) ~ /^(USER|ENTRYPOINT|CMD)$/ { bypasses_s6 = 1 }
  END { exit bypasses_s6 ? 0 : 1 }
' "$dockerfile"; then
  fail "USER, ENTRYPOINT, and CMD must not bypass the LinuxServer s6-overlay lifecycle"
fi

for required_file in \
  "$service_dir/run" \
  "$service_dir/type" \
  "$service_dir/dependencies.d/base" \
  "root/etc/s6-overlay/s6-rc.d/user/contents.d/svc-flame"; do
  [ -f "$required_file" ] || fail "missing required s6 file: $required_file"
done

[ -x "$service_dir/run" ] || fail "$service_dir/run must remain executable"
grep -Fq '#!/command/with-contenv bash' "$service_dir/run" ||
  fail "the Flame service must inherit the LinuxServer container environment"
grep -Fq 'exec s6-setuidgid abc node server.js' "$service_dir/run" ||
  fail "the Flame service must run Node as LinuxServer's mapped abc user"
[ "$(cat "$service_dir/type")" = "longrun" ] || fail "the Flame s6 service must remain a longrun"

grep -Fq 'PUID=' "$compose_file" || fail "Compose must expose LinuxServer PUID mapping"
grep -Fq 'PGID=' "$compose_file" || fail "Compose must expose LinuxServer PGID mapping"

echo "LinuxServer container contract verified ($runtime_base)"
