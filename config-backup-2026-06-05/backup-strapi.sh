#!/bin/bash
# 補備份 Strapi 設定（作者 / 頁首頁尾範本 / 文章預設 / 預設內容）
# 用法：先啟動 Strapi，再於本資料夾執行： ./backup-strapi.sh
# 讀取專案根目錄 .env.local 的 NEXT_PUBLIC_STRAPI_URL 與 STRAPI_API_TOKEN

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; source "$ROOT/.env.local"; set +a

URL="${NEXT_PUBLIC_STRAPI_URL:-http://localhost:1337}"
OUT="$(dirname "$0")/strapi"
mkdir -p "$OUT"

echo "Strapi: $URL"

# 健康檢查
code=$(curl -s -m 10 -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STRAPI_API_TOKEN" "$URL/api/authors") || code=000
if [ "$code" = "000" ] || [ "$code" = "404" ]; then
  echo "❌ Strapi 無法連線（HTTP $code）。請先啟動 Strapi 再執行。"
  exit 1
fi

declare -A endpoints=(
  ["authors"]="/api/authors?pagination[pageSize]=1000&populate=*"
  ["header-disclaimer-templates"]="/api/header-disclaimer-templates?pagination[pageSize]=1000&populate=*"
  ["footer-disclaimer-templates"]="/api/footer-disclaimer-templates?pagination[pageSize]=1000&populate=*"
  ["article-type-presets"]="/api/article-type-presets?pagination[pageSize]=1000&populate=*"
  ["default-content-setting"]="/api/default-content-setting?populate=*"
)

for name in "${!endpoints[@]}"; do
  echo "備份 $name ..."
  curl -s -m 30 -H "Authorization: Bearer $STRAPI_API_TOKEN" \
    "$URL${endpoints[$name]}" | jq '.' > "$OUT/${name}.json" \
    && echo "  ✅ $OUT/${name}.json ($(wc -c < "$OUT/${name}.json") B)" \
    || echo "  ⚠️  失敗: $name"
done

echo "🎉 Strapi 設定已備份至 $OUT"
