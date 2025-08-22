#!/bin/bash

# 創建備份目錄
BACKUP_DIR="config-backup-$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

echo "開始備份 R2 配置文件到 $BACKUP_DIR..."

# 備份各個 Agent 配置
agents=("contentAgent" "prWriterAgent" "copyEditorAgent" "imageGeneration")

for agent in "${agents[@]}"; do
    echo "正在備份 $agent..."
    curl -s "http://localhost:3000/api/config/ai/agents/$agent" \
         -H "Content-Type: application/json" \
         -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
         | jq '.' > "$BACKUP_DIR/${agent}.json"
    
    if [ $? -eq 0 ]; then
        echo "✅ 備份完成: ${agent}.json"
    else
        echo "⚠️  備份失敗: $agent"
    fi
done

# 備份完整配置
echo "正在備份完整配置..."
curl -s "http://localhost:3000/api/config/ai" \
     -H "Content-Type: application/json" \
     -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
     | jq '.' > "$BACKUP_DIR/full-config.json"

if [ $? -eq 0 ]; then
    echo "✅ 備份完成: full-config.json"
else
    echo "⚠️  備份失敗: full-config"
fi

echo "🎉 所有配置已備份至: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
