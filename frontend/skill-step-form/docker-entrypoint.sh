#!/bin/sh
# Copies the built site into the volume the gateway nginx serves from.
#
# The volume outlives deploys, so files removed from the site (a deleted blog
# post's pre-rendered page, an unused image) used to stay online forever.
# After copying, anything not in this build is removed, except assets/: tabs
# opened before the deploy still load their old hashed code from there.
set -e
SRC=/app/build
DEST=/usr/share/nginx/html

echo "Copying frontend files to shared volume..."
cp -r "$SRC"/. "$DEST"/

cd "$DEST"
find . -type f ! -path './assets/*' | while read -r f; do
  if [ ! -e "$SRC/$f" ]; then
    echo "Removing stale file: $f"
    rm -f "$f"
  fi
done
find . -mindepth 1 -type d ! -path './assets' ! -path './assets/*' -empty -delete

echo "Frontend files copied. Keeping container alive..."
exec tail -f /dev/null
