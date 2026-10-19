# 🧱 打工人模拟器 · 城市求生

> 终端风格文字冒险 + 模拟经营游戏。你从乡下揣着 500 块钱来到大城市，
> 搬砖、送外卖、学技能、考证书、恋爱结婚、买房买车……从一无所有，到在这座城市活下去。

## ✨ 功能特性

| 模块 | 说明 |
|---|---|
| 🧑‍💼 角色创建 | 姓名 / 性别 / 性格 / 学历 / 专业，四维技能点分配（体力、智力、魅力、运气） |
| 🏗️ 一般职业 | 发传单、搬砖、外卖骑手、快递员、售楼、会所迎宾、保安、服务员、收银员、服装店员等 11 种 |
| 🎓 成人培训 | 会计、计算机、厨师、电工、焊工、美容美发 6 门课程，学满熟练度 → 交费考试 → 拿证书 |
| 💼 特殊职业 | 初级会计、程序员、电工、焊工、厨师、会计主管等，需对应证书，薪资碾压普通职业 |
| 🗑️ 捡废品 / 🏪 摆地摊 | 街头求生小收入，运气与魅力加持 |
| 🍜 饮食系统 | 路边摊、沙县、串串、火锅、自己做饭……恢复饱腹/体力/心情 |
| 🏠 住宿系统 | 睡大街（有风险）、桥洞、日租房、青旅、城中村单间（月租）、公寓 |
| 💕 社交恋爱 | 大街陌生人 / 工作同事，聊天、请客、送礼加好感；30 朋友 → 50 暧昧 → 60 表白恋爱 → 90 求婚结婚 |
| 🛍️ 商场购物 | 衣服 / 裤子 / 手表 / 手机 / 宠物猫，提升魅力与声望；部分工作对着装有硬性要求 |
| 🏡 资产系统 | 5 套房源 + 6 款车型，买房买车涨声望、解锁免费住宿、配送提效、商铺日租 |
| 🏦 银行存款 | 现金可存银行吃日息 0.05% |
| 🎫 娱乐 | 刮刮乐（10元/张即时开奖）、双色球（2元/注，每日 21:30 自动开奖，头奖 500 万） |
| 🌆 随机事件 | 捡钱包、被偷、暴雨、老乡请客、城管驱赶、临时加班……运气属性影响事件走向 |
| 🏆 成就系统 | 12 项成就（第一桶金、持证上岗、有车有房、修成正果、一夜暴富……） |
| ⏱️ 时间系统 | **1 游戏分钟 = 1 现实秒**；支持暂停 / 1× / 2× / 4× 倍速 |
| 💾 存档 | 3 个手动槽位 + 每日清晨自动存档，JSON 格式可备份 |

## 🛠️ 技术架构

- **后端**：Spring Boot 3.3.5（Java 17+）+ Jackson
- **模板**：Thymeleaf
- **前端**：jQuery 3.7.1 + xterm.js 5.3.0（终端渲染）+ FitAddon
- **配置**：游戏数值全部外置于 JSON 文件（`config/game-config.json`），改完重启即生效
- **存档**：运行时写入 `saves/` 目录（JSON）

## 🚀 运行方式

### 方式一：直接运行（推荐，已打包）

```bash
cd worker-simulation
java -jar target/worker-simulator-1.0.0.jar
# 或重新打包：./mvnw -DskipTests package
```

### 方式二：源码运行

```bash
cd worker-simulation
./mvnw spring-boot:run        # 需要本机有 Maven 或首次自动下载
```

启动后浏览器打开：**http://localhost:8080**

### 自定义配置启动

```bash
java -jar target/worker-simulator-1.0.0.jar \
  --game.config-path=/绝对路径/your-config.json \
  --server.port=9090
```

## 🎮 玩法速览

1. **创建角色** → 选学历（决定技能点总量）、性格、专业，分配四维技能点
2. **开局求生**：去 `人才市场` 找份工作（`jobs` / `sign 编号`），或在大街 `scrap` 捡废品
3. **攒钱路线**：打工 → 吃饭 → 睡觉，攒够学费后去 `培训中心` 学技能、考证书
4. **跃迁**：拿证书入职特殊职业（日薪 160-350），继续攒钱
5. **人生巅峰**：商场置装提升魅力 → 社交恋爱结婚 → 存钱买房买车 → 彩票暴富
6. 随时 `save` / `load`，`pause` 暂停，`speed 2/4` 加速

### 常用指令

```
help           查看全部指令       status         查看状态
move 人才市场  前往地点           jobs           招聘信息
sign 3         入职(按编号)       resign         辞职
work 8         打工8小时          scrap          捡废品
stall          摆地摊             train 1        学习课程
exam 1         结业考试           eat            吃饭
sleep          睡觉               housing        选择住处
shop / buy 1   商场购物           assets         查看资产
buyhouse 1     买房               buycar 1       买车
bank 500       存钱               withdraw 100   取钱
social         附近的人           talk 1         聊天
treat 1        请客               gift 1         送礼
confess 1      表白               propose 1      求婚
scratch 3      刮刮乐             lottery buy 5  买双色球
achievements   成就               save 1         存档
load 1         读档               pause/resume   暂停/继续
speed 4        4倍速
```

## 📁 目录结构

```
worker-simulation/
├── pom.xml                     # Maven 配置（Spring Boot 3.3.5）
├── config/game-config.json     # ★ 外部游戏配置（职业/课程/物价/事件/成就）
├── saves/                      # 运行时存档目录（JSON）
├── src/main/java/com/cityworker/sim/
│   ├── CityWorkerApplication.java
│   ├── controller/             # 页面路由 + 游戏 API
│   ├── service/                # 游戏引擎（时间/指令/职业/培训/社交/彩票/存档）
│   ├── model/                  # 状态模型与配置模型
│   └── util/Ansi.java          # 终端颜色工具
└── src/main/resources/
    ├── application.yml         # 端口/存档目录/初始参数
    ├── config/game-config.json # 内置配置（启动时自动导出到 ./config/）
    ├── templates/              # index 标题页 / game 游戏页
    └── static/                 # css / js / img（AI 生成插图）/ vendor（xterm/jquery）
```

## ⚙️ 数值平衡说明

- 时间：1 游戏分钟 = 1 现实秒；一天 1440 分钟 = 24 分钟现实时间
- 开局：500 元现金，体力 100 / 饱腹 80 / 心情 70
- 一般职业时薪：8~16 元/小时；特殊职业 20~44 元/小时（证书是最大分水岭）
- 培训：学费 1800~3000 元，智力与专业影响学习速度，通过率与智力/熟练度挂钩
- 所有数值均可在 `config/game-config.json` 中调整（重启生效）

## 📝 已知说明

- 单机单人游戏，状态保存在服务端内存，刷新页面不丢档（每日自动存档兜底）
- 若修改了外部配置文件，需重启服务生效
- 头像与场景插图为 AI 生成，位于 `src/main/resources/static/img/`

## 📄 许可证

本项目基于 **MIT License** 开源 —— 可自由使用、修改、分发与商用，仅需保留版权声明。详见 [LICENSE](LICENSE)。
