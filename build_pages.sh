#!/bin/bash
# Собирает копию суфлёра для GitHub Pages (папка docs/).
# Исходник один — index.html (он же артефакт в Claude). Здесь он только оборачивается
# в полный HTML-каркас: в Claude этот каркас добавляет сама площадка.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p docs
{
  printf '%s\n' '<!doctype html>' '<html lang="ru">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' \
    '<meta name="robots" content="noindex,nofollow">' \
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>' \
    '</head>' '<body>'
  cat index.html
  printf '\n%s\n' '</body>' '</html>'
} > docs/index.html
printf 'User-agent: *\nDisallow: /\n' > docs/robots.txt
touch docs/.nojekyll
echo "Собрано: docs/index.html"
