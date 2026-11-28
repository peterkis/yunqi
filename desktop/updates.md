# 运气通院内更新

诊室首装使用完整离线包。日常更新包复用已安装的 WebView2 145 或更高版本，并携带运气通主程序、进程内 Rust 规则引擎、工作台与离线字体。两个安装包沿用同一应用标识、x64 NSIS 和按用户安装范围。

## 配置与构建

准备一个诊室电脑可访问的院内 HTTP 地址和一个 Node.js 24 进程。发布私钥保留在受控的发布环境，更新服务持有放行私钥及发布公钥。客户端只包含两个公钥。发布清单的 Ed25519 签名覆盖包的 SHA-256、长度、分片摘要和版本。安装前客户端校验包字节，并验证院内服务针对本次随机请求签发的放行状态。

在受控目录内生成密钥。以下命令假设两个密钥目录均已创建，且只向相应运维账号开放。

```powershell
node desktop/update-service.mjs keygen D:/YunQiSigning/release.pem D:/YunQiSigning/release.pub
node desktop/update-service.mjs keygen D:/YunQiApproval/approval.pem D:/YunQiApproval/approval.pub
$env:YUNQI_UPDATE_URL = 'http://yunqi-updates.intranet:8780/'
$env:YUNQI_UPDATE_RELEASE_KEY = (Get-Content D:/YunQiSigning/release.pub -Raw).Trim()
$env:YUNQI_UPDATE_APPROVAL_KEY = (Get-Content D:/YunQiApproval/approval.pub -Raw).Trim()
./desktop/build.ps1
# 将本次完整包归档后再构建精简包。
./desktop/build.ps1 -UpgradeOnly
```

同版本的两种包使用相同的生成文件名。分别在各自打包完成后归档并记录 SHA-256。上面的域名是部署示例。配置工程测试时可使用 `127.0.0.1:8780` 和测试公钥。缺少更新源或有效公钥时，客户端保持离线使用。正式交付应使用实际院内地址和发布环境的公钥重打完整包及精简包。

## 运行与发布

更新服务使用一个进程监听院内接口。发布目录应由发布账号写入，服务账号读取。进程内全局只发送一个 2 MiB 分片，默认限速 512 KiB/s，繁忙客户端随机延后重试。服务绑定的监听地址和端口由院内配置决定。

```powershell
node desktop/update-service.mjs serve D:/YunQiUpdates D:/YunQiSigning/release.pub D:/YunQiApproval/approval.pem 192.0.2.10 8780 524288
node desktop/update-service.mjs publish D:/YunQiUpdates D:/YunQiBuilds/YunQi-0.2.1-x64-Update.exe 0.2.1 145 D:/YunQiSigning/release.pem
node desktop/update-service.mjs pause D:/YunQiUpdates
node desktop/update-service.mjs resume D:/YunQiUpdates
node desktop/update-service.mjs withdraw D:/YunQiUpdates
```

`publish` 把安装包复制到内容寻址路径，再原子替换当前发布清单。版本填写实际包版本。暂停会让检查、分片及安装放行请求稍后重试，已下载的分片保留。撤回移除当前清单，签名放行复核将拒绝该版本。更新正在覆盖安装前刚收到的放行结果只适用于那次安装。

客户端当前工程阈值为 CPU 使用率不高于 30%，可用内存至少 1 GiB 且不低于总量的 10%。仅在收到锁屏通知之后评估下载。解锁取消在途下载，保留已写入的完整分片。安装需要医生授权，复核或验签失败时继续已装版本。

覆盖安装失败后，客户端停止自动重试。运维侧保留一份已验证的上一可用完整离线包，用于离线修复。部署前使用相同安装范围验证 WebView2、首装、更新与恢复，并记录 Win10/11 和院内终端策略的实际结果。Ed25519 更新校验与 Windows Authenticode 发布者签名分开配置。

## 验证入口

- `node --test desktop/update-service.test.mjs` 验证服务端签名、分片限流和撤回。
- `cargo test --release --locked --manifest-path desktop/src-tauri/Cargo.toml` 验证原生行为及签名校验。
- 工作台的 `DesktopUpdateNotice.test.tsx` 验证前台提醒、医生选择和重启确认。
- `desktop/verify-update-installed.cjs` 在已安装的工程 WebView2 中验证「下次启动时安装」选项。
