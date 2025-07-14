#!/bin/bash

# 測試 OpenAI API 格式
echo "🔍 測試 OpenAI API 格式..."

# 檢查環境變數
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY 環境變數未設置"
    exit 1
fi

# 測試 Chat Completions API
echo "📝 測試 Chat Completions API..."
curl -X POST "https://api.openai.com/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "你是一個測試助手。"},
            {"role": "user", "content": "請回答：這是一個測試"}
        ],
        "temperature": 0.3,
        "max_tokens": 50,
        "top_p": 0.95
    }' | jq .

echo ""

# 測試 Image Generation API
echo "🎨 測試 Image Generation API..."
curl -X POST "https://api.openai.com/v1/images/generations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-image-1",
        "prompt": "A test image for API validation",
        "size": "1024x1024",
        "quality": "standard",
        "n": 1,
        "response_format": "b64_json"
    }' | jq '.data[0].b64_json | length'

echo ""

# 測試 Gemini API 格式
echo "🧠 測試 Gemini API 格式..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️ GEMINI_API_KEY 環境變數未設置，跳過 Gemini 測試"
else
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{
                "parts": [{
                    "text": "這是一個測試請求"
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 50,
                "topP": 0.95
            }
        }' | jq .
fi

echo ""
echo "✅ API 格式測試完成"
