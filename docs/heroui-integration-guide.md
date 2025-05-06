# HeroUI 整合指南與最佳實踐

本文檔記錄了將應用程序從 NextUI 遷移到 HeroUI 的過程，以及我們解決主題色、樣式衝突和其他相關問題的經驗。

## 背景

HeroUI 是 NextUI 的新名稱，提供相同的功能和組件，但使用了新的包名和更新的API。在整合過程中，我們發現多個需要特別注意的問題，尤其是在亮色模式下的色彩對比度、主題切換設置，以及與全局 CSS 的衝突。

## 最新修改記錄

### 1. 修正組件導入方式

為了遵循官方建議的最佳實踐，我們修改了組件的導入方式，從單獨的包導入而不是從 `@heroui/react` 導入：

```jsx
// ❌ 不推薦的導入方式
import { Button, Card, CardBody } from '@heroui/react';

// ✅ 推薦的導入方式
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
```

### 2. 修復 Provider 配置

我們更新了 Provider 配置，移除了嵌套的 div 包裝，改為直接使用 `HeroUIProvider`：

```jsx
// src/app/providers.tsx
'use client';

import { HeroUIProvider } from "@heroui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ReactNode } from "react";
import { ProcessingProvider } from "@/context/ProcessingContext";
import { ThemeProvider } from "next-themes";

// 直接使用 HeroUIProvider，不再需要嵌套的主題感知包裝器
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <HeroUIProvider>
          <ProcessingProvider>
            {children}
          </ProcessingProvider>
        </HeroUIProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
```

### 3. 修復無障礙性警告

為包含非純文本內容的 Item 元素添加 `textValue` 屬性：

```jsx
// 添加 textValue 到 AccordionItem
<AccordionItem 
  key={index} 
  textValue={feature.title}
  title={
    <div className="flex items-center">
      <div className="flex h-6 w-6 items-center justify-center rounded-full">
        {index + 1}
      </div>
      <span>{feature.title}</span>
    </div>
  }
>
  // ...內容
</AccordionItem>

// 添加 textValue 到 Tab
<Tab key="content" title="內容預覽" textValue="內容預覽">
  // ...內容
</Tab>

// 添加 textValue 到 SelectItem
<SelectItem key={category.id} textValue={category.name}>
  <div className="flex items-center gap-2">
    <span>{category.name}</span>
  </div>
</SelectItem>
```

### 4. 安裝獨立組件

使用 HeroUI CLI 工具安裝單獨的組件包：

```bash
# 安裝按鈕組件
npx heroui-cli@latest add button

# 安裝多個組件
npx heroui-cli@latest add card input select chip checkbox

# 安裝手風琴組件
npx heroui-cli@latest add accordion

# 安裝其他組件
npx heroui-cli@latest add tabs divider progress
```

## 當前架構與使用方式

### HeroUI 架構最佳實踐

1. **Provider 配置**：
   - 使用 `<HeroUIProvider>` 包裝整個應用
   - 結合 `next-themes` 實現主題切換時，確保動態設置 `className`
   - 處理客戶端水合問題，避免 SSR 與 CSR 不匹配
   - 主題類名直接設置在 html 或 body 標籤上，確保全局一致性

2. **主題系統**：
   - 使用 `dark` 和 `light` 類名控制主題
   - 使用語義化的顏色變量 (`bg-background`, `text-foreground`, `border-divider`)
   - 避免直接硬編碼顏色（如 `bg-white`, `text-gray-600`）

3. **Tailwind 配置**：
   - 使用 HeroUI 提供的 `heroui()` 插件配置主題
   - 為亮色和暗色模式配置不同的顏色方案
   - 確保足夠的對比度，特別是亮色模式

4. **組件使用**：
   - 從單獨的包導入組件，如 `import { Button } from "@heroui/button";` 
   - 對於複雜組件，確保提供完整的無障礙性支持（如 `textValue` 屬性）
   - 使用 HeroUI 的設計系統（間距、陰影、圓角等）並保持一致性

### 正確的組件導入方式

```jsx
// ✅ 官方推薦的導入方式
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { Select, SelectItem } from "@heroui/select";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Progress } from "@heroui/progress";
import { Divider } from "@heroui/divider";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";

// 對於複雜應用，可以創建自己的組件庫
// src/components/ui/MyButton.tsx
import { Button as HeroButton } from "@heroui/button";

export const MyButton = (props) => {
  return <HeroButton {...props} />;
};
```

### HeroUI CLI 工具的使用

HeroUI 官方推薦使用 CLI 工具來安裝和管理組件：

```bash
# 添加單個組件
npx heroui-cli@latest add button

# 添加多個組件
npx heroui-cli@latest add button card input

# 添加主庫
npx heroui-cli@latest add @heroui/react
```

## 學習到的經驗教訓

1. **主題集成問題**：
   - NextUI/HeroUI 的主題系統與 next-themes 集成需要特別注意
   - 直接設置 `HeroUIProvider` 的 `theme` 屬性不一定有效
   - 應該在 html/body 元素上設置主題類，確保整個應用保持一致的主題
   - 使用 `suppressHydrationWarning` 屬性避免水合警告

2. **組件無障礙性**：
   - HeroUI 的組件（如 `Select`, `Tabs`, `Accordion`）對無障礙性有嚴格要求
   - 包含非純文本內容的組件必須提供 `textValue` 或其他等效屬性
   - SelectItem、AccordionItem、Tab 等元素特別需要注意

3. **色彩對比度**：
   - 亮色模式的顏色需要仔細調整，確保良好的對比度
   - 暗色模式通常對比度較好，但亮色模式更容易出現問題
   - 避免使用太淺的顏色作為文本或功能元素

4. **CSS 變量衝突**：
   - 全局 CSS 變量可能與 HeroUI 的變量衝突
   - 使用前綴或不同名稱避免衝突
   - 優先使用 HeroUI 的主題系統和 Tailwind 類

5. **水合問題**：
   - 客戶端渲染的組件（如主題切換器）需要處理水合問題
   - 使用 `useEffect` 和 `useState` 確保組件在客戶端正確渲染
   - 對可能出現水合問題的元素使用 `suppressHydrationWarning`

6. **組件包導入最佳實踐**：
   - 從單獨的包導入組件比從 `@heroui/react` 導入更高效
   - 這會減小最終打包的代碼體積，提高性能
   - 使用 HeroUI CLI 可以自動安裝所需的每個組件包

## 解決方案記錄

### 無障礙性警告解決方案

1. **問題**：控制台顯示無障礙性警告 `<Item> with non-plain text contents is unsupported by type to select for accessibility`
   **解決方案**：為所有 Item 元素（如 SelectItem、Tab、AccordionItem）添加 textValue 屬性：

   ```jsx
   <SelectItem key={category.id} textValue={category.name}>
     <div className="flex items-center gap-2">
       <span>{category.name}</span>
     </div>
   </SelectItem>

   <Tab key="content" title="內容預覽" textValue="內容預覽">
     {/* 內容 */}
   </Tab>

   <AccordionItem key={index} textValue={feature.title}>
     {/* 內容 */}
   </AccordionItem>
   ```

### 組件導入方式修正

1. **問題**：從 `@heroui/react` 導入不符合官方建議，可能影響性能和未來兼容性
   **解決方案**：使用 HeroUI CLI 安裝單獨的組件包，並從單獨的包導入組件：

   ```bash
   # 安裝單獨的組件包
   npx heroui-cli@latest add button card input
   ```

   ```jsx
   // 修改前
   import { Button, Card, CardBody } from '@heroui/react';
   
   // 修改後
   import { Button } from '@heroui/button';
   import { Card, CardBody } from '@heroui/card';
   ```

### 主題設置改進

1. **問題**：嵌套 div 上設置主題類名可能導致主題傳播問題
   **解決方案**：簡化 Provider 結構，直接在 html/body 上設置主題類名：

   ```jsx
   // 修改前
   function ThemedHeroUIProvider({ children }) {
     const { resolvedTheme } = useTheme();
     const [isMounted, setIsMounted] = useState(false);
     
     useEffect(() => {
       setIsMounted(true);
     }, []);

     if (!isMounted) {
       return <>{children}</>;
     }
     
     return (
       <HeroUIProvider>
         <div className={resolvedTheme === "dark" ? "dark" : "light"}>
           {children}
         </div>
       </HeroUIProvider>
     );
   }

   // 修改後 - providers.tsx
   export function Providers({ children }) {
     return (
       <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
         <HeroUIProvider>
           {children}
         </HeroUIProvider>
       </ThemeProvider>
     );
   }

   // layout.tsx
   <html lang="zh-TW" suppressHydrationWarning>
     <body className={`${inter.className} bg-background text-foreground`} suppressHydrationWarning>
       <Providers>
         {children}
       </Providers>
     </body>
   </html>
   ```

## 建議的下一步

1. **統一設計系統使用**：
   - 統一使用 HeroUI 提供的陰影、間距和圓角類
   - 確保所有頁面和組件使用一致的樣式

2. **完全移除 @heroui/react 依賴**：
   - 檢查是否還有任何組件從 @heroui/react 導入
   - 可能需要更新任何第三方組件的導入方式

3. **測試無障礙性**：
   - 使用無障礙性測試工具（如 Axe, Lighthouse）檢查應用
   - 確保所有交互元素都具有正確的 ARIA 屬性

4. **性能優化**：
   - 監測組件渲染性能
   - 檢查是否存在冗餘的主題切換邏輯

## 參考資源

- [HeroUI 官方文檔](https://www.heroui.com/docs)
- [NextUI 到 HeroUI 遷移指南](https://www.heroui.com/docs/guide/nextui-to-heroui)
- [Next.js 框架集成](https://www.heroui.com/docs/frameworks/nextjs)
- [HeroUI Provider API](https://www.heroui.com/docs/api-references/heroui-provider)
- [Tailwind CSS 主題定制](https://www.heroui.com/docs/customization/theme) 
- [HeroUI CLI 工具](https://www.heroui.com/docs/api-references/cli-api) 

## 最新發現問題與優化建議

在深入比對 HeroUI 官方文件及現有實現後，我們識別出以下仍需調整的問題：

### 1. Tailwind 配置文件格式問題 - ✅ 已解決

**問題**：現有的 `tailwind.config.js` 使用 CommonJS 格式 (`require`/`module.exports`)，導致 ESLint 顯示警告。

**解決方案**：
- 添加 ESLint 忽略註釋 `// eslint-disable-next-line @typescript-eslint/no-require-imports`
- 確認官方文檔中也使用了 CommonJS 風格，這是適當的實踐

**官方示例**：官方文檔中 Tailwind 配置的示例實際上也使用了 CommonJS 風格：
```js
// tailwind.config.js
const { heroui } = require("@heroui/theme");

module.exports = {
  content: ["./node_modules/@heroui/theme/dist/components/*.js"],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [heroui()],
};
```

### 2. HeroUIProvider 導入方式 - ✅ 已確認

**問題**：`providers.tsx` 仍從 `@heroui/react` 導入 `HeroUIProvider`

**官方標準**：根據 HeroUI 官方文檔，Provider 確實應從主包導入：
```jsx
import { HeroUIProvider } from "@heroui/react";
```

**結論**：這部分我們的實現是正確的，Provider 不需要從獨立包導入。

### 3. 仍有部分 UI 組件庫使用 @heroui/react - ✅ 已修正

**問題**：根據搜索結果，有 6 個文件使用 `@heroui/react` 導入組件
- src/components/ui/tabs/Tabs.tsx
- src/components/ui/card/Card.tsx
- src/components/ui/progress/Progress.tsx
- src/components/ui/input/Input.tsx
- src/components/ui/button/Button.tsx
- src/components/progress/ProgressDisplay.tsx

**官方明確警告**：
> "**Important 🚨**: Note that you need to import the component from the individual package, not from `@heroui/react`."

**已完成的修改**：
- 所有 UI 組件文件已更新，改為從對應的獨立包導入，例如：
  ```jsx
  // 修改前
  import { Button as HeroButton } from '@heroui/react';
  
  // 修改後
  import { Button as HeroButton } from '@heroui/button';
  ```

### 4. Next.js 18/19 兼容性考慮 - ⚠️ 持續關注

**問題**：HeroUI 官方文檔提到對完整的 React 19 支持正在進行中

**官方規劃**：
> "Complete React 19 support and codebase migration"

**建議**：密切關注 HeroUI 更新，確保在未來 React 19 版本發布時能順利過渡

### 5. Tailwind CSS v4 支持 - ⚠️ 持續關注

**問題**：官方提到準備支持 Tailwind CSS v4，當前項目已使用 v4

**官方規劃**：
> "Tailwind CSS v4 support"

**優化建議**：
- 保持當前使用的 Tailwind CSS v4
- 持續關注 HeroUI 對 Tailwind CSS v4 的官方支持更新，可能需要調整配置

### 6. ESM 與 CommonJS 混用問題 - ✅ 部分解決

**問題**：項目中同時存在 ESM (import/export) 和 CommonJS (require/module.exports) 模式，可能導致構建與開發環境不一致

**解決進展**：
- 確認 Tailwind 配置使用 CommonJS 是符合官方示例的做法
- 使用 ESLint 忽略註釋處理特定文件中的 require 導入警告

### 7. HeroUI CLI 工具完整利用 - ✅ 已確認

**問題**：我們可能未完全利用 HeroUI CLI 的全部功能來管理組件

**處理方式**：
- 確認所用 HeroUI 組件已是最新版本
- 測試使用 `npx heroui-cli@latest upgrade` 命令確認組件版本狀態
ˇˇ
### 8. HeroUIProvider 全局動畫控制 - ⚠️ 新發現

**問題**：HeroUI v2.4.0 引入了新的 Provider 選項，用於全局控制動畫

**官方說明**：
> "Disable Animations Globally - Allows users to disable animation globally via HeroUIProvider"

**建議實現**：
```jsx
<HeroUIProvider disableAnimation>
  {children}
</HeroUIProvider>
```

**優化建議**：
- 考慮在性能受限設備上使用此選項提高應用性能
- 可在開發環境中使用此選項減少視覺干擾

### 9. 其他新增 API 屬性 - ⚠️ 新發現

**問題**：HeroUI v2.4.0 引入了新的通用屬性

**官方提及的新屬性**：
- `disableRipple` - 禁用漣漪動畫效果
- `skipFramerMotionAnimations` - 跳過 Framer Motion 動畫
- `validationBehavior` - 表單驗證行為設置

**建議**：
- 在適當的組件中考慮使用這些屬性以提高用戶體驗
- 設計系統時考慮這些屬性提供的靈活性

## 已完成修改摘要

以下是我們針對 HeroUI 整合的具體修改：

1. **ESLint 警告解決**：
   - 在 `tailwind.config.js` 添加適當的 ESLint 忽略註釋
   - 確認使用 CommonJS 格式符合官方示例

2. **正確的組件導入方式**：
   - 將 6 個使用 `@heroui/react` 導入的文件更新為使用對應獨立包
   - 保留 Provider 從主包導入的方式，符合官方建議

3. **組件版本管理**：
   - 使用 HeroUI CLI 的 `upgrade` 命令確認組件版本狀態
   - 確認所有組件均為最新版本

## 後續監控要點

1. **React 19 兼容性**：
   - 持續關注 HeroUI 對 React 19 的官方支持進展
   - 準備好在適當時機進行相應更新

2. **Tailwind CSS v4 整合**：
   - 監控 HeroUI 關於 Tailwind CSS v4 的正式支持通知
   - 準備好調整配置以適應官方的 Tailwind CSS v4 支持方式

3. **模塊系統一致性**：
   - 在未來的組件開發中保持導入方式的一致性
   - 優先使用官方建議的獨立包導入方式
   - 在添加新組件時始終使用 CLI 工具

```bash
# 添加單個組件
npx heroui-cli@latest add button

# 添加多個組件
npx heroui-cli@latest add button card input

# 更新組件版本
npx heroui-cli@latest upgrade
```

4. **全局選項**：
   - 評估是否需要使用新的全局設置，如 `disableAnimation`
   - 考慮性能與用戶體驗的平衡，為不同設備類型優化