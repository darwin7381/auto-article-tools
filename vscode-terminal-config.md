# VS Code 终端配置指南

为了确保 VS Code 使用正确的 Node.js 版本（而不是系统默认的旧版本），您可以按照以下步骤配置：

## 方法1: 设置默认终端 Shell

1. 打开 VS Code
2. 按下快捷键 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux) 打开命令面板
3. 输入 "Terminal: Select Default Profile"（或中文：终端：选择默认配置文件）
4. 选择 "bash"、"zsh" 或您安装较新 Node.js 版本的 shell

## 方法2: 在 settings.json 中配置

1. 按下快捷键 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux) 打开命令面板
2. 输入 "Preferences: Open Settings (JSON)"（或中文：首选项：打开设置 (JSON)）
3. 添加以下配置：

```json
// 设置终端默认 shell 路径（例如使用 brew 安装的 Node 环境）
"terminal.integrated.defaultProfile.osx": "bash",
// 或使用特定的配置
"terminal.integrated.profiles.osx": {
  "node-env": {
    "path": "bash",
    "args": ["-c", "source ~/.nvm/nvm.sh && nvm use 20 && bash"]
  }
},
"terminal.integrated.defaultProfile.osx": "node-env"
```

## 方法3: NVM 自动切换方案

如果您使用的是 NVM 管理 Node.js 版本，可以在项目根目录创建 `.nvmrc` 文件来自动切换版本：

```
echo "20" > .nvmrc
```

然后在您的 `~/.bashrc` 或 `~/.zshrc` 文件中添加以下内容，使终端自动切换到指定版本：

```bash
# 自动切换 Node 版本的函数
cdnvm() {
    cd "$@" || return $?
    if [[ -f .nvmrc && -r .nvmrc ]]; then
        nvm use
    fi
}
alias cd=cdnvm
```

## 方法4: 项目特定 shell 命令

在 VS Code 中，您可以打开集成终端并执行以下命令来切换到项目所需的 Node.js 版本：

```bash
# 如果使用 NVM
source ~/.nvm/nvm.sh && nvm use 20

# 或在不需要的情况下，直接指定路径
export PATH="/path/to/node/v20/bin:$PATH"
```

在运行 `npm run dev` 之前，使用这些命令确保正确的 Node.js 版本被启用。

---

方法5: 使用 shell PATH 插件

安装 VS Code 的 "Shell Path" 插件，可以设置 VS Code 使用的终端 PATH 环境变量，确保它能找到正确的 Node.js 版本。
