# 康复师工作台首发说明

## 首发边界

本版本用于 1–3 名内部康复师的小规模灰度，不面向公众开放。首发主流程为：

```text
患者建档 → 接诊 → 专项评估 → 报告人工确认 → 康复计划 → 复测
```

早筛同步、家庭任务和家庭回传接口保留，但不作为首发验收项。产品输出是筛查、功能评估与康复工作流辅助信息，不构成医学诊断。

## 数据边界

- Nginx Basic Auth 是首发最低访问控制，公网部署必须再配置 HTTPS。
- 后端端口 `8000` 只能在 Docker 内网暴露，禁止直接发布到公网。
- LLM 密钥只保存在 `deploy/.env.production`，浏览器构建中不得出现 `VITE_*_API_KEY`。
- SQLite 数据库存放在 `deploy/data/`，不进入 Git。
- 当前患者、接诊和评估主数据仍有一部分保存在浏览器 IndexedDB。首发应固定一台受管控电脑和一个浏览器配置文件使用，不支持多设备实时同步。
- 不使用真实患者数据做上线冒烟测试；正式录入前必须确认备份和访问人员名单。

## 首次部署

需要 Docker Engine、Docker Compose、域名/HTTPS 入口，以及 Apache `htpasswd` 工具。

```bash
cd deploy
cp .env.production.example .env.production
mkdir -p data secrets backups
htpasswd -cB secrets/htpasswd therapist
docker compose build
docker compose up -d
docker compose ps
```

默认在服务器 `8080` 端口提供服务。生产环境应由云负载均衡、Caddy 或外层 Nginx 提供 HTTPS，并反向代理到 `127.0.0.1:8080`。

上线检查：

```bash
curl -u therapist http://127.0.0.1:8080/health
curl -u therapist http://127.0.0.1:8080/ready
docker compose logs --tail=100 backend frontend
```

## 灰度验收

部署前先在仓库根目录运行无污染的后端闭环验收：

```bash
python scripts/release_acceptance.py
npm run check
npm run build
npm test -- --run src/hub/__tests__/report-center-utils.test.ts
```

第一条命令会自动启动临时后端、使用临时 SQLite 数据库，并验证健康检查、筛查建档、身份绑定、家庭访问、量表下发、越权拦截和结果回流；退出后测试数据自动删除。

使用合成患者完成：

1. 新建患者并生成公开档案码。
2. 新建一次接诊。
3. 完成至少一个无需摄像头的量表或 ROM 记录。
4. 完成一次浏览器摄像头授权与快速体态采集。
5. 检查报告中心的数据完整性、缺失提示和人工确认入口。
6. 生成一份综合报告；无 LLM 密钥时应明确失败或进入兜底路径，不能伪造结果。
7. 重启容器后确认 SQLite 集成数据仍存在。

## 备份与回滚

SQLite 备份前暂停后端写入：

```bash
cd deploy
docker compose stop backend
cp data/rehab_integration.db "backups/rehab_integration-$(date +%Y%m%d-%H%M%S).db"
docker compose start backend
```

应用回滚：

```bash
docker compose down
git switch <previous-release-tag-or-commit>
docker compose build --no-cache
docker compose up -d
```

回滚应用时不要覆盖 `deploy/data/`。涉及数据库结构变更时，先恢复到独立测试目录验证兼容性。

## 上线阻塞项

- GitHub 公共历史中曾提交 `backend/rehab_integration.db`。新分支已停止跟踪，但彻底删除需要经过批准后重写相关远程历史，或先将仓库改为私有。
- 尚未建立正式机构账户、角色权限和审计日志；Basic Auth 只适合受控内测。
- 浏览器 IndexedDB 仍是部分工作站数据源，清除浏览器数据会造成丢失；正式多设备版本需要后端化患者/接诊/评估存储。
