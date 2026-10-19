package com.cityworker.sim.service;

import com.cityworker.sim.model.CommandResult;
import com.cityworker.sim.model.CharacterModel;
import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.model.StartRequest;
import com.cityworker.sim.util.Ansi;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 游戏主服务：持有全局游戏状态，驱动时间系统（1 游戏分钟 = 1 现实秒 × 倍速），
 * 分发终端指令，并提供 HUD 视图与存档接口。
 */
@Service
public class GameService {

    private static final Logger log = LoggerFactory.getLogger(GameService.class);
    private static final int MINUTES_PER_DAY = 1440;

    private final GameConfigLoader loader;
    private final SaveService saveService;
    private final Random rnd = new Random();

    @Value("${game.start-day:1}")
    private int startDay;
    @Value("${game.start-hour:8}")
    private int startHour;
    @Value("${game.start-minute:0}")
    private int startMinute;
    @Value("${game.start-money:500}")
    private int startMoney;

    private GameState state;
    private long lastAutoSaveDay = -1;
    private int lastStockDay = -1;

    // ---- SSE 实时推送（替代高频轮询） ----
    private final CopyOnWriteArrayList<SseEmitter> sseClients = new CopyOnWriteArrayList<>();
    private long lastPushNanos = 0L;
    private static final long SSE_MIN_INTERVAL_NANOS = 600_000_000L;   // 最低推送间隔 0.6s
    private static final long SSE_HEARTBEAT_NANOS = 20_000_000_000L;   // 空闲 20s 发心跳防断连
    private static final long SSE_CLIENT_TIMEOUT_MS = 60_000L;          // 单个 SSE 客户端 60s 无交互自动断开
    private static final long SSE_PAUSED_KEEPALIVE_NANOS = 5_000_000_000L;  // 暂停时每 5s 推送一次保活

    public GameService(GameConfigLoader loader, SaveService saveService) {
        this.loader = loader;
        this.saveService = saveService;
    }

    // ============ 对外状态访问 ============

    public GameState state() { return state; }
    public GameConfig cfg() { return loader.get(); }
    public Random rnd() { return rnd; }

    // ============ 新建 / 载入 ============

    public synchronized CommandResult startNewGame(StartRequest req) {
        GameConfig cfg = loader.get();
        List<String> out = new ArrayList<>();

        GameConfig.EducationDef edu = cfg.education.stream().filter(e -> e.id.equals(req.educationId)).findFirst().orElse(null);
        GameConfig.PersonalityDef per = cfg.personalities.stream().filter(p -> p.id.equals(req.personalityId)).findFirst().orElse(null);
        GameConfig.MajorDef maj = cfg.majors.stream().filter(m -> m.id.equals(req.majorId)).findFirst().orElse(null);
        if (edu == null || per == null || maj == null) {
            return CommandResult.fail(Ansi.red("创建角色失败：配置缺失"), view());
        }
        int alloc = req.str + req.intel + req.charm + req.luck;
        if (alloc > edu.points) {
            return CommandResult.fail(Ansi.red("技能点超限：最多可分配 " + edu.points + " 点"), view());
        }

        GameState s = new GameState();
        s.started = true;
        s.gameMinutes = (startDay - 1L) * MINUTES_PER_DAY + startHour * 60L + startMinute;
        s.locationId = "street";
        s.paused = false;
        s.speed = 1;

        CharacterModel ch = new CharacterModel();
        ch.name = (req.name == null || req.name.isBlank()) ? "铁蛋" : req.name.trim();
        ch.gender = "female".equals(req.gender) ? "female" : "male";
        ch.personalityId = per.id;
        ch.educationId = edu.id;
        ch.majorId = maj.id;
        ch.str = edu.str + per.str + maj.str + req.str;
        ch.intel = edu.intel + per.intel + maj.intel + req.intel;
        ch.charm = edu.charm + per.charm + maj.charm + req.charm;
        ch.luck = edu.luck + per.luck + maj.luck + req.luck;
        ch.money = startMoney;
        ch.stamina = 100;
        ch.hunger = 80;
        ch.mood = 70;
        s.character = ch;
        state = s;

        initMarket();
        initFixedNpcs();
        lastStockDay = s.day();

        out.add(Ansi.banner("WORKER SIMULATOR", "CITY SURVIVAL SIM"));
        out.add("");
        out.add(Ansi.cyan("　　「车站的广播在身后渐渐远去，你攥着皱巴巴的 " + startMoney + " 块钱，"));
        out.add(Ansi.cyan("　　 第一次踏上了这座灯火通明的城市。」"));
        out.add("");
        out.add(Ansi.gray("　　你来自 " + edu.name + " 学历的 " + homeVillage(edu.id) + "，"));
        out.add(Ansi.gray("　　性格 " + per.name + "，" + per.desc + "。"));
        out.add(Ansi.gray("　　口袋里只有 " + startMoney + " 元，今晚可能要在公园的长椅上过夜。"));
        out.add("");
        out.add(Ansi.yellow("　　★ 输入 help 查看指令，输入 status 查看状态。"));
        out.add(Ansi.yellow("　　★ 先去人才市场 jobs 找份工作，或者去大街 scrap 捡点废品。"));
        out.add("");
        checkAchievements(out);
        pushState();
        return CommandResult.of(out, view());
    }

    private String homeVillage(String eduId) {
        return switch (eduId) {
            case "primary" -> "黄土坡村";
            case "middle" -> "柳树沟镇";
            case "high" -> "青石县";
            case "college" -> "临江市";
            default -> "省城郊县";
        };
    }

    public synchronized CommandResult loadGame(int slot) {
        try {
            state = slot == 0 ? saveService.loadAuto() : saveService.load(slot);
            state.paused = false;
            // 兼容旧存档：补齐市场与固定 NPC
            if (state.market == null || state.market.isEmpty()) initMarket();
            if (state.npcs == null || state.npcs.stream().noneMatch(n -> n.isFixed)) initFixedNpcs();
            else addShopNpcs();   // 有旧固定 NPC 的存档：只补齐商铺 NPC，不重置好感
            // 兼容旧存档：v1.9/v2.0 新字段补默认
            if (state.collegeProgress == null) state.collegeProgress = new java.util.HashMap<>();
            if (state.collegeGraduated == null) state.collegeGraduated = new java.util.ArrayList<>();
            if (state.npcDebt == null) state.npcDebt = new java.util.HashMap<>();
            // 兼容旧存档：无穿戴记录时，把已有可穿戴物品自动穿上（同类别只穿最新一件）
            if (state.equipped == null) state.equipped = new ArrayList<>();
            if (state.equipped.isEmpty()) {
                for (String id : state.inventory) {
                    GameConfig.MallItemDef it = loader.item(id);
                    if (it != null && isWearable(it.category)) {
                        state.equipped.removeIf(otherId -> {
                            GameConfig.MallItemDef o = loader.item(otherId);
                            return o != null && o.category.equals(it.category);
                        });
                        state.equipped.add(id);
                    }
                }
            }
            lastStockDay = state.day();
            List<String> out = new ArrayList<>();
            out.add(Ansi.banner("读档成功", "存档已恢复"));
            out.add(Ansi.gray("欢迎回来，" + state.character.name + "！现在是 " + state.fullTimeStr() + "。"));
            checkAchievements(out);
            pushState();
            return CommandResult.of(out, view());
        } catch (IOException e) {
            log.warn("读档失败: {}", e.getMessage());
            return CommandResult.fail(Ansi.red("读档失败：" + e.getMessage()), view());
        }
    }

    public synchronized CommandResult saveGame(int slot) {
        if (state == null || !state.started) return CommandResult.fail(Ansi.red("当前没有进行中的游戏"), view());
        try {
            if (slot == 0) saveService.autosave(state);
            else saveService.save(state, slot);
            List<String> out = new ArrayList<>();
            out.add(Ansi.green("✔ 存档成功（槽位 " + (slot == 0 ? "自动" : slot) + "）"));
            pushState();
            return CommandResult.of(out, view());
        } catch (IOException e) {
            return CommandResult.fail(Ansi.red("存档失败：" + e.getMessage()), view());
        }
    }

    public synchronized void resetGame() {
        state = null;
        pushState();
    }

    /** 一键新周目：继承部分资产（现金 30%+安家费、车辆、证书、成就、关系好感） */
    public synchronized CommandResult newGame() {
        if (state == null || !state.started) return CommandResult.fail(Ansi.red("当前没有进行中的游戏"), view());
        GameState old = state;
        GameState s = new GameState();
        s.started = true;
        s.gameMinutes = (startDay - 1L) * MINUTES_PER_DAY + startHour * 60L + startMinute;
        s.locationId = "street";
        s.paused = false;
        s.speed = old.speed;
        s.newGameCount = old.newGameCount + 1;

        CharacterModel ch = new CharacterModel();
        ch.name = old.character.name;
        ch.gender = old.character.gender;
        ch.personalityId = old.character.personalityId;
        ch.educationId = old.character.educationId;
        ch.majorId = old.character.majorId;
        ch.str = Math.max(10, old.character.str * 8 / 10);
        ch.intel = Math.max(10, old.character.intel * 8 / 10);
        ch.charm = Math.max(10, old.character.charm * 8 / 10);
        ch.luck = Math.max(10, old.character.luck * 8 / 10);
        ch.money = old.character.money * 3 / 10 + 1000;   // 30% 现金 + 1000 安家费
        ch.stamina = 100;
        ch.hunger = 80;
        ch.mood = 70;
        s.character = ch;
        s.ownedCars.addAll(old.ownedCars);
        s.certificates.addAll(old.certificates);
        s.achievements.addAll(old.achievements);
        s.npcs.addAll(old.npcs);
        state = s;
        initMarket();
        lastStockDay = s.day();

        List<String> out = new ArrayList<>();
        out.add(Ansi.banner("新周目开启", "NEW GAME+"));
        out.add("");
        out.add(Ansi.cyan("　　「日子推倒重来，但这一回你不再是两手空空。」"));
        out.add(Ansi.gray("　　保留了 30% 现金（" + ch.money + " 元）、" + s.ownedCars.size() + " 辆车、" + s.certificates.size() + " 张证书。"));
        out.add(Ansi.gray("　　老熟人们还记得你，属性保留八成（最低 10 点）。"));
        out.add(Ansi.yellow("　　先去人才市场看看，这一世别再睡大街了。"));
        checkAchievements(out);
        pushState();
        return CommandResult.of(out, view());
    }

    public synchronized void setPaused(boolean paused) {
        if (state != null) state.paused = paused;
        pushState();
    }

    // ============ 时间系统 ============

    /** 每秒由 TickService 调用：推进 1 游戏分钟 × 倍速，结算被动效果 */
    public synchronized void tick() {
        if (state == null || !state.started || state.gameOver) return;
        if (state.paused) {
            // 暂停：不推进时间，仅每 5s 推一次轻量状态保活，前端据此感知暂停/保持连接
            if (System.nanoTime() - lastPushNanos >= SSE_PAUSED_KEEPALIVE_NANOS) pushState();
            return;
        }
        GameConfig cfg = loader.get();
        CharacterModel ch = state.character;

        int elapsed = state.speed;      // 本 tick 推进的游戏分钟
        state.gameMinutes += elapsed;

        // 被动属性流逝：节奏放缓 —— 时间流逝只轻微消耗，大幅消耗来自工作/移动等行动
        // 饱腹：每 18 游戏分钟 -1（一天约 -80，吃 3 顿可维持）
        state.hungerTick += elapsed;
        while (state.hungerTick >= 18) {
            state.hungerTick -= 18;
            ch.hunger = Math.max(0, ch.hunger - 1);
        }
        // 饿到极点（饱腹<15）：每 20 分钟掉 1 体力
        if (ch.hunger < 15) {
            state.starveTick += elapsed;
            while (state.starveTick >= 20) {
                state.starveTick -= 20;
                ch.stamina = Math.max(0, ch.stamina - 1);
                if (ch.stamina <= 0) { collapse(); return; }
            }
        }
        // 饿着（饱腹<40）：每 30 分钟心情 -1
        if (ch.hunger < 40) {
            state.hungryMoodTick += elapsed;
            while (state.hungryMoodTick >= 30) {
                state.hungryMoodTick -= 30;
                ch.mood = Math.max(0, ch.mood - 1);
            }
        }
        // 心情自然消磨：每 90 分钟 -1
        state.moodTick += elapsed;
        while (state.moodTick >= 90) {
            state.moodTick -= 90;
            ch.mood = Math.max(0, ch.mood - 1);
        }
        // 吃饱了慢慢回体力：每 90 分钟 +1
        if (ch.hunger >= 60 && ch.stamina < 100) {
            state.recoverTick += elapsed;
            while (state.recoverTick >= 90) {
                state.recoverTick -= 90;
                ch.stamina = Math.min(100, ch.stamina + 1);
            }
        }

        // 日切：新的一天
        if (state.day() != lastAutoSaveDay) {
            rolloverDay();
            lastAutoSaveDay = state.day();
        }

        // 股市波动：每 30 游戏分钟一次
        state.stockTick += elapsed;
        while (state.stockTick >= 30) {
            state.stockTick -= 30;
            stockStep();
        }

        // 生病：每 90 分钟恶化（心情-2、体力-1）
        if (state.sick) {
            state.sickTick += elapsed;
            while (state.sickTick >= 90) {
                state.sickTick -= 90;
                ch.mood = Math.max(0, ch.mood - 2);
                ch.stamina = Math.max(0, ch.stamina - 1);
                if (ch.stamina <= 0) { collapse(); return; }
            }
        }

        // 股票内幕小概率事件（整体利好/利空）
        if (rnd.nextInt(1000) < 2 && !state.market.isEmpty()) {
            boolean good = rnd.nextBoolean();
            GameState.StockQuote q = state.market.get(rnd.nextInt(state.market.size()));
            double move = q.price * (good ? 0.02 + rnd.nextDouble() * 0.02 : -(0.02 + rnd.nextDouble() * 0.02));
            q.price = Math.max(0.5, Math.round((q.price + move) * 100.0) / 100.0);
            q.history.add(q.price);
            if (q.history.size() > 60) q.history.remove(0);
            pushEvent(Ansi.cyan((good ? "📰 利好消息：" : "📰 利空消息：") + q.name + " 股价异动，现价 " + String.format("%.2f", q.price) + " 元（stock 查看）"));
        }

        // 彩票开奖（21:30）
        if (state.minuteOfDay() == cfg.lottery.drawHour * 60 + cfg.lottery.drawMinute && state.lotteryPending > 0) {
            drawLottery();
        }

        // 随机事件
        if (rnd.nextInt(100) < 2 + ch.luck / 10) {
            rollRandomEvent();
        }

        // 大街生成陌生人
        if ("street".equals(state.locationId) && rnd.nextInt(180) == 0) {
            long streetNpc = state.npcs.stream().filter(n -> "street".equals(n.source) && !"SPOUSE".equals(n.relation)).count();
            if (streetNpc < 3) {
                NPC npc = buildNpc("street");
                state.npcs.add(npc);
                pushEvent(Ansi.cyan("🚶 街对面走来一个" + npcNameWithTitle(npc) + "，似乎可以搭讪（social）"));
            }
        }

        // 破产判定
        if (ch.money < -2000) {
            state.gameOver = true;
            state.gameOverReason = "负债累累，走投无路，你只能买张车票回老家……";
            pushEvent(Ansi.red("💀 游戏结束：负债累累，你收拾行李回了老家。"));
        }

        pushState();
    }

    private void rolloverDay() {
        CharacterModel ch = state.character;
        List<String> lines = new ArrayList<>();
        lines.add(Ansi.darkGray("—— " + state.dateStr() + " 清晨，" + state.timeStr() + " ——"));

        // 月租房租期结算
        if (state.leaseDays > 0) {
            state.leaseDays--;
            if (state.leaseDays <= 0) {
                GameConfig.HousingDef old = loader.housing(state.housingId);
                state.housingId = "street";
                ch.mood = Math.max(0, ch.mood - 10);
                lines.add(Ansi.red("⚠ 你的" + (old != null ? old.name : "租房") + "到期了，被房东赶了出来……"));
            }
        }

        // 商铺被动收入
        int passive = 0;
        for (String e : state.ownedEstates) {
            GameConfig.RealEstateDef def = loader.estate(e);
            if (def != null) passive += def.passiveIncome;
        }
        if (passive > 0) {
            ch.money += passive;
            lines.add(Ansi.green("💰 商铺收租 +" + passive + " 元"));
        }
        // 存款利息
        if (ch.deposit > 0) {
            int interest = (int) Math.floor(ch.deposit * 0.0005);
            if (interest > 0) {
                ch.deposit += interest;
                lines.add(Ansi.green("🏦 存款利息 +" + interest + " 元"));
            }
        }
        // 穿戴/宠物每日心情加成
        int moodBonus = gearMoodBonus();
        if (moodBonus > 0) {
            ch.mood = Math.min(100, ch.mood + moodBonus);
            if (state.inventory.contains("cat")) {
                lines.add(Ansi.pink("🐱 小橘猫蹭了蹭你，心情 +" + moodBonus));
            } else if (state.inventory.contains("goldfish")) {
                lines.add(Ansi.pink("🐟 小金鱼吐了个泡泡，心情 +" + moodBonus));
            } else {
                lines.add(Ansi.pink("💖 身上的好东西让你心情 +" + moodBonus));
            }
        }
        // ---- v1.9：天气 / 贷款利息 / 理财到期 / 每日任务 ----
        lines.add(ExtraActions.rollWeather(this));
        lines.addAll(ExtraActions.settleBank(this));
        lines.add(ExtraActions.refreshQuests(this));
        // 好感度自然下降
        for (NPC n : state.npcs) {
            if (n.lastInteractDay < state.day() - 1 && !"SPOUSE".equals(n.relation) && n.affection > 0) {
                n.affection = Math.max(0, n.affection - 1);
            }
        }
        // ---- v2.2 婚后生活：配偶每天带给你家的温度 ----
        if (state.married && state.marriedDay >= 0) {
            int years = Math.max(0, (state.day() - state.marriedDay) / 30);
            ch.mood = Math.min(100, ch.mood + 3);
            lines.add(Ansi.pink("💍 配偶做了早饭等你醒来，心情 +3"
                    + (years > 0 ? "（结婚 " + years + " 个月了，日子越过越有烟火气）" : "")));
        }
        // ---- v2.2 娱乐NPC每日交流次数重置 ----
        if (!state.entChatDay.isEmpty()) state.entChatDay.clear();
        // 每日自动存档
        try {
            saveService.autosave(state);
        } catch (IOException e) {
            log.warn("自动存档失败: {}", e.getMessage());
        }
        if (!lines.isEmpty()) {
            state.eventQueue.addAll(lines);
            state.eventLog.add(Ansi.plain(lines.get(0)));
        }
    }

    private void collapse() {
        CharacterModel ch = state.character;
        ch.stamina = 20;
        ch.hunger = Math.max(0, ch.hunger - 10);
        ch.mood = Math.max(0, ch.mood - 15);
        int cost = 150 + rnd.nextInt(150);
        ch.money -= cost;
        pushEvent(Ansi.red("💥 你饿晕/累倒在路边！路人叫了救护车，医药费 " + cost + " 元。"));
        if (ch.money < 0) {
            pushEvent(Ansi.red("你的钱包见了底，身上一毛钱都不剩了……"));
        }
    }

    // ============ 指令分发 ============

    public synchronized CommandResult exec(String raw) {
        if (state == null || !state.started) {
            List<String> out = new ArrayList<>();
            out.add(Ansi.red("游戏尚未开始，请先创建角色或读取存档。"));
            return CommandResult.of(out, view());
        }
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.isEmpty()) return CommandResult.of(new ArrayList<>(), view());

        List<String> out = new ArrayList<>();
        String[] parts = trimmed.split("\\s+");
        String cmd = norm(parts[0]);
        String[] args = Arrays.copyOfRange(parts, 1, parts.length);

        try {
            switch (cmd) {
                case "help" -> { help(out); }
                case "status" -> status(out);
                case "move" -> move(out, args);
                case "jobs" -> JobActions.jobs(this, out);
                case "sign" -> JobActions.sign(this, out, args);
                case "resign" -> JobActions.resign(this, out);
                case "work" -> JobActions.work(this, out, args);
                case "scrap" -> JobActions.scrap(this, out);
                case "stall" -> WholesaleActions.stall(this, out, args);
                case "train" -> TrainActions.train(this, out, args);
                case "exam" -> TrainActions.exam(this, out, args);
                case "eat" -> LifeActions.eat(this, out, args);
                case "sleep" -> LifeActions.sleep(this, out, args);
                case "exercise" -> LifeActions.exercise(this, out);
                case "read" -> LifeActions.readBook(this, out);
                case "pray" -> LifeActions.pray(this, out);
                case "donate" -> LifeActions.donate(this, out);
                case "housing" -> LifeActions.housing(this, out, args);
                case "shop" -> ShopActions.shop(this, out);
                case "buy" -> ShopActions.buy(this, out, args);
                case "bag" -> InventoryActions.bag(this, out);
                case "wear" -> InventoryActions.wear(this, out, args);
                case "takeoff" -> InventoryActions.takeoff(this, out, args);
                case "assets" -> ShopActions.assets(this, out);
                case "buyhouse" -> ShopActions.buyHouse(this, out, args);
                case "buycar" -> ShopActions.buyCar(this, out, args);
                case "sellcar" -> ShopActions.sellCar(this, out, args);
                case "bank" -> ShopActions.bank(this, out, args);
                case "withdraw" -> ShopActions.withdraw(this, out, args);
                case "social" -> SocialActions.social(this, out);
                case "talk" -> SocialActions.talk(this, out, args);
                case "treat" -> SocialActions.treat(this, out, args);
                case "gift" -> SocialActions.gift(this, out, args);
                case "confess" -> SocialActions.confess(this, out, args);
                case "propose" -> SocialActions.propose(this, out, args);
                case "divorce" -> SocialActions.divorce(this, out, args);
                case "help_npc" -> SocialActions.help(this, out, args);
                case "borrow" -> SocialActions.borrow(this, out, args);
                case "learn_npc" -> SocialActions.learn(this, out, args);
                case "gossip" -> SocialActions.gossip(this, out, args);
                case "business" -> BusinessActions.business(this, out, args);
                case "open" -> BusinessActions.open(this, out, args);
                case "run" -> BusinessActions.run(this, out);
                case "upgrade" -> BusinessActions.upgrade(this, out);
                case "close" -> BusinessActions.close(this, out);
                case "scratch" -> GambleActions.scratch(this, out, args);
                case "lottery" -> GambleActions.lottery(this, out, args);
                case "wholesale" -> WholesaleActions.wholesale(this, out, args);
                case "stock" -> StockActions.stock(this, out, args);
                case "bj", "blackjack" -> ParkActions.bj(this, out, args);
                case "gomoku", "gobang" -> ParkActions.gomoku(this, out, args);
                case "meditate", "chanxiu" -> LifeActions.meditate(this, out);
                case "spa", "anmo" -> LifeActions.spa(this, out);
                case "practice", "liangqiu" -> LifeActions.practice(this, out);
                case "worship", "baicaishen" -> LifeActions.worship(this, out);
                case "ringtoss", "taoquan" -> MarketActions.ringtoss(this, out);
                case "antique", "taogudong" -> MarketActions.antique(this, out);
                case "fortune", "qiqian" -> MarketActions.fortune(this, out);
                case "npc" -> NpcActions.npc(this, out, args);
                case "phone" -> LifeActions.phone(this, out);
                case "home" -> HomeActions.home(this, out, args);
                case "pc" -> HomeActions.pc(this, out, args);
                case "family" -> HomeActions.family(this, out, args);
                case "achievements" -> achievements(out);
                case "save" -> { out.addAll(saveGameArg(args).lines); }
                case "load" -> { out.addAll(loadGameArg(args).lines); }
                case "newgame", "newgameplus", "restart" -> { out.addAll(newGame().lines); }
                case "slots" -> slots(out);
                case "pause" -> { state.paused = true; out.add(Ansi.yellow("⏸ 时间已暂停（输入 resume 继续）")); }
                case "resume" -> { state.paused = false; out.add(Ansi.green("▶ 时间继续流动")); }
                // ---- v1.9 都市生活充实包 ----
                case "gig" -> ExtraActions.gig(this, out);
                case "bargain" -> ExtraActions.bargain(this, out);
                case "arrange" -> ExtraActions.arrange(this, out);
                case "battle" -> ExtraActions.battle(this, out, args);
                case "network" -> ExtraActions.network(this, out);
                case "news" -> ExtraActions.news(this, out);
                case "balloon" -> ExtraActions.balloon(this, out);
                case "goldfish" -> ExtraActions.goldfish(this, out);
                case "match" -> ExtraActions.match(this, out);
                case "pigeon" -> ExtraActions.pigeon(this, out);
                case "loan" -> ExtraActions.loan(this, out, args);
                case "finance" -> ExtraActions.finance(this, out, args);
                case "quest" -> ExtraActions.quest(this, out);
                case "weather" -> ExtraActions.weather(this, out);
                // ---- v2.0 成人大学 ----
                case "college", "adu" -> AdultActions.college(this, out, args);
                case "answer" -> {
                    if (state.pendingAdultExam != null) AdultActions.college(this, out, new String[]{"answer", cmd.contains(" ") ? cmd.substring(cmd.indexOf(' ') + 1) : ""});
                    else out.add(Ansi.yellow("没有进行中的考试。先 college exam <编号> 开考，或 college answer <题号><选项>… 交卷。"));
                }
                // ---- v2.0 地点深度交互 ----
                case "conv" -> LocationActions.conv(this, out);
                case "bulletin" -> LocationActions.bulletin(this, out);
                case "tryon" -> LocationActions.tryon(this, out);
                case "taste" -> LocationActions.taste(this, out);
                case "flowerwork" -> LocationActions.flowerWork(this, out);
                case "music" -> LocationActions.music(this, out);
                case "snooker" -> LocationActions.snooker(this, out);
                case "lounge" -> LocationActions.lounge(this, out);
                case "studylotto" -> LocationActions.studyLotto(this, out);
                case "marketwork" -> LocationActions.marketWork(this, out);
                case "lobby" -> LocationActions.lobby(this, out);
                case "testdrive" -> LocationActions.testDrive(this, out);
                case "viewhome" -> LocationActions.viewHome(this, out);
                case "stroll" -> LocationActions.stroll(this, out);
                case "nightwalk" -> LocationActions.nightWalk(this, out);
                case "ghosttalk" -> LocationActions.ghostTalk(this, out);
                // ---- v2.1 趣味问答（终端走答题弹窗由前端接管；此处给纯终端兜底提示） ----
                case "fun" -> {
                    out.add(Ansi.yellow("🎲 趣味问答：请用图形界面点击「交互」里的趣味问答按钮参与（终端版本请打开游戏界面操作）。"));
                    out.add(Ansi.gray("　答题答对有小红包，答错长见识，图一乐。"));
                }
                // ---- v2.2 车辆互动 / 娱乐场所 ----
                case "car" -> CarActions.car(this, out, args);
                case "ktv" -> EntertainmentActions.ktv(this, out, args);
                case "pv" -> EntertainmentActions.pv(this, out, args);
                case "entchat" -> EntertainmentActions.entChat(this, out, args);
                default -> {
                    out.add(Ansi.red("未知指令：" + parts[0]));
                    out.add(Ansi.gray("输入 help 查看全部指令"));
                }
            }
        } catch (Exception e) {
            log.error("指令执行异常", e);
            out.add(Ansi.red("指令执行出错：" + e.getMessage()));
        }

        // 每日任务进度追踪（动作成功后推进）
        trackQuestFor(cmd, args);

        // 追加挂起的随机事件
        List<String> pending = drainEvents();
        if (!pending.isEmpty()) {
            out.add("");
            out.add(Ansi.darkGray("── 期间发生的事情 ──"));
            out.addAll(pending);
        }
        checkAchievements(out);
        pushState();
        return CommandResult.of(out, view());
    }

    private String norm(String tok) {
        if (tok == null) return "";
        return switch (tok.toLowerCase()) {
            case "帮助", "help", "h", "?" -> "help";
            case "状态", "status", "s" -> "status";
            case "移动", "去", "move", "go" -> "move";
            case "工作", "打工", "work" -> "work";
            case "招聘", "jobs", "job" -> "jobs";
            case "入职", "应聘", "sign", "hire" -> "sign";
            case "辞职", "resign", "quitjob" -> "resign";
            case "捡废品", "捡", "scrap", "pick" -> "scrap";
            case "摆摊", "stall", "vendor" -> "stall";
            case "批发", "进货", "wholesale" -> "wholesale";
            case "学习", "课程", "培训", "train" -> "train";
            case "趣味", "问答", "互动", "fun" -> "fun";
            case "考试", "exam" -> "exam";
            case "吃", "吃饭", "eat" -> "eat";
            case "睡觉", "睡", "sleep" -> "sleep";
            case "锻炼", "健身", "exercise", "跑步" -> "exercise";
            case "读书", "看书", "自习", "read" -> "read";
            case "祈福", "拜拜", "pray" -> "pray";
            case "行善", "捐赠", "donate" -> "donate";
            case "住宿", "housing", "hotel", "住" -> "housing";
            case "商场", "shop", "mall" -> "shop";
            case "买", "buy" -> "buy";
            case "资产", "assets", "property" -> "assets";
            case "买房", "buyhouse" -> "buyhouse";
            case "买车", "buycar" -> "buycar";
            case "存钱", "bank", "deposit" -> "bank";
            case "取钱", "withdraw" -> "withdraw";
            case "社交", "附近的人", "social" -> "social";
            case "聊天", "talk" -> "talk";
            case "请客", "treat" -> "treat";
            case "送礼", "gift" -> "gift";
            case "表白", "confess" -> "confess";
            case "求婚", "propose" -> "propose";
            case "离婚", "divorce" -> "divorce";
            // ---- v2.0 NPC 深度互动 ----
            case "帮忙", "帮个忙", "搭把手" -> "help_npc";
            case "向人借", "borrow", "借点" -> "borrow";
            case "请教", "学两手", "learn" -> "learn_npc";
            case "八卦", "知心话", "gossip", "闲聊" -> "gossip";
            case "创业", "开店", "business" -> "business";
            case "经营", "run" -> "run";
            case "升级", "upgrade" -> "upgrade";
            case "转让", "close" -> "close";
            case "刮刮乐", "scratch" -> "scratch";
            case "彩票", "lottery" -> "lottery";
            case "成就", "achievements", "ach" -> "achievements";
            case "新周目", "newgame" -> "newgame";
            case "套圈", "ringtoss" -> "ringtoss";
            case "冥想", "meditate" -> "meditate";
            case "spa", "按摩" -> "spa";
            case "练球", "practice" -> "practice";
            case "拜财神", "worship" -> "worship";
            case "淘古董", "antique" -> "antique";
            case "求签", "fortune" -> "fortune";
            case "存档", "save" -> "save";
            case "读档", "load" -> "load";
            case "槽位", "slots" -> "slots";
            case "暂停", "pause" -> "pause";
            case "继续", "resume" -> "resume";
            // ---- v1.9 都市生活充实包 ----
            case "打零工", "零工", "帮工", "gig" -> "gig";
            case "砍价", "买菜", "bargain" -> "bargain";
            case "插花", "学插花", "arrange" -> "arrange";
            case "台球对局", "对局", "battle" -> "battle";
            case "商务应酬", "应酬", "network" -> "network";
            case "小报", "报纸", "看报", "news" -> "news";
            case "打气球", "气球", "balloon" -> "balloon";
            case "捞金鱼", "金鱼", "goldfish" -> "goldfish";
            case "相亲角", "相亲", "match" -> "match";
            case "喂鸽子", "鸽子", "pigeon" -> "pigeon";
            case "贷款", "借钱", "loan" -> "loan";
            case "理财", "投资", "finance" -> "finance";
            case "天气", "weather" -> "weather";
            // ---- v2.0 成人大学 ----
            case "成人大学", "大学", "college", "adu", "上学" -> "college";
            case "交卷", "作答", "answer" -> "answer";
            // ---- v2.0 地点深度交互 ----
            case "小卖部", "唠嗑", "conv" -> "conv";
            case "公告栏", "看告示", "bulletin" -> "bulletin";
            case "试衣", "试穿", "tryon" -> "tryon";
            case "试吃", "taste" -> "taste";
            case "整理花材", "花店帮工", "flowerwork" -> "flowerwork";
            case "听歌", "驻唱", "music" -> "music";
            case "斯诺克", "snooker" -> "snooker";
            case "会所大堂", "lounge" -> "lounge";
            case "研究走势", "走势图", "studylotto" -> "studylotto";
            case "菜摊帮工", "挑菜", "marketwork" -> "marketwork";
            case "大堂经理", "lobby" -> "lobby";
            case "试驾", "testdrive" -> "testdrive";
            case "看样板间", "看房", "viewhome" -> "viewhome";
            case "遛弯", "散步", "stroll" -> "stroll";
            case "逛夜市", "nightwalk" -> "nightwalk";
            // ---- v2.2 车辆互动 / 娱乐场所 ----
            case "用车", "车辆", "开车", "car" -> "car";
            case "兜风", "drive" -> "car";
            case "ktv", "唱歌", "点公主", "点少爷", "陪唱" -> "ktv";
            case "私人会所技师", "点技师", "pv", "按摩服务" -> "pv";
            case "私下交流", "entchat", "约人" -> "entchat";
            case "听古话", "鬼市唠嗑", "ghosttalk" -> "ghosttalk";
            default -> tok.toLowerCase();
        };
    }

    /** 每日任务进度追踪：动作指令 → 任务类型（仅成功执行的动作计入，列表类指令不计） */
    private void trackQuestFor(String cmd, String[] args) {
        if (state == null || state.quests == null || state.quests.isEmpty()) return;
        boolean hasArg = args != null && args.length > 0;
        String type = switch (cmd) {
            case "work", "scrap", "exercise", "read", "donate", "sign", "pray", "worship" -> cmd.equals("worship") ? "pray" : cmd;
            case "stall", "talk", "eat", "train" -> hasArg ? cmd : null;
            case "ringtoss", "balloon", "goldfish" -> "night";
            default -> null;
        };
        if (type == null) return;
        ExtraActions.questProgress(this, type);
    }

    // ============ 通用指令 ============

    private void help(List<String> out) {
        out.add(Ansi.banner("打工人生存手册", "COMMAND MANUAL"));
        out.add("");
        out.add(Ansi.gold("── 生存基础 ──"));
        out.add(Ansi.cyan("  status/状态        查看完整状态"));
        out.add(Ansi.cyan("  move <地点>        移动：大街/人才市场/培训中心/成人大学/商场/美食街/花店/酒吧/台球厅/会所/住处/工作地点/彩票店/百味鸡/地摊麻辣烫/饺子馆/火锅店/菜市场/小商品批发/银行/交易大厅/4S店/房产中介/城市公园/夜市/鬼市"));
        out.add(Ansi.cyan("  work [小时]        打工（默认8小时，最多12，超8算加班1.5倍）"));
        out.add(Ansi.cyan("  eat [编号]         吃饭恢复体力与饱腹"));
        out.add(Ansi.cyan("  sleep              睡觉（按当前住处质量恢复体力）"));
        out.add(Ansi.cyan("  scrap              大街捡废品换钱"));
        out.add(Ansi.cyan("  stall              摆地摊（凭魅力赚钱，小心城管）"));
        out.add(Ansi.cyan("  exercise           锻炼30分钟（每2天+1体力）"));
        out.add(Ansi.cyan("  read               读书1小时（每2天+1智力，住处/培训中心）"));
        out.add(Ansi.cyan("  pray               花店祈福（50元，每3天+1运气）"));
        out.add(Ansi.cyan("  donate             大街行善（捐100元，每2天+1运气+声望）"));
        out.add("");
        out.add(Ansi.gold("── 职业与技能 ──"));
        out.add(Ansi.cyan("  jobs               人才市场查看岗位（白领岗位有学历要求）"));
        out.add(Ansi.cyan("  sign <编号>        入职（部分岗位有属性/学历/服装/证书要求）"));
        out.add(Ansi.cyan("  resign             辞职"));
        out.add(Ansi.cyan("  train              培训中心查看课程"));
        out.add(Ansi.cyan("  train <编号>       学习答题：答对即完成本节课（图形弹窗）"));
        out.add(Ansi.cyan("  exam <编号>        结业考试：答对全部题目拿证书（图形弹窗）"));
        out.add(Ansi.cyan("  college            成人大学：查看学历班级（move 成人大学）"));
        out.add(Ansi.cyan("  college enroll/study/exam <编号>  报名/上课/毕业考试"));
        out.add(Ansi.cyan("  college answer <序列>            终端交卷（如 1A2B3C4D5A）"));
        out.add(Ansi.cyan("  fun                地点趣味问答（图形弹窗答题，答对拿红包）"));
        out.add("");
        out.add(Ansi.gold("── 消费与资产 ──"));
        out.add(Ansi.cyan("  shop               商场购物（衣服/手表/手机/宠物）"));
        out.add(Ansi.cyan("  buy <编号>         购买"));
        out.add(Ansi.cyan("  bag                查看背包与穿戴（bag 弹窗/终端均可）"));
        out.add(Ansi.cyan("  wear <编号/名称>   穿戴（提升魅力/声望，职业要求着装）"));
        out.add(Ansi.cyan("  takeoff <编号/名称> 卸下装备"));
        out.add(Ansi.cyan("  housing            查看住处，rent <编号> 租住"));
        out.add(Ansi.cyan("  assets             查看资产（房产/车辆/存款）"));
        out.add(Ansi.cyan("  buyhouse <编号>    买房（房产中介，声望+睡觉免费）"));
        out.add(Ansi.cyan("  buycar <编号>      买车（4S店，外卖快递加成）"));
        out.add(Ansi.cyan("  bank <金额> / withdraw <金额>  存钱/取钱（银行，日息0.05%）"));
        out.add(Ansi.cyan("  bj [下注]          城市公园21点：bj hit 要牌 / stand 停牌 / double 加倍"));
        out.add(Ansi.cyan("  gomoku [下注]      城市公园五子棋：gomoku put <行> <列> 落子 / view 看盘"));
        out.add("");
        out.add(Ansi.gold("── 社交与娱乐 ──"));
        out.add(Ansi.cyan("  social             附近的人"));
        out.add(Ansi.cyan("  talk/treat/gift <编号>  聊天/请客/送礼 增加好感"));
        out.add(Ansi.cyan("  confess <编号>     表白（好感≥60）"));
        out.add(Ansi.cyan("  propose <编号>     求婚（好感≥90，有房更稳）"));
        out.add(Ansi.cyan("  divorce <编号>     离婚（夫妻双方，500元手续）"));
        out.add(Ansi.cyan("  talk <编号> <话题> 指定话题聊天（家乡/工作/美食/理财/人生/八卦）"));
        out.add(Ansi.cyan("  car                用车：drive兜风/wash洗车/fuel加油/taxi黑车/ride载熟人/race飙车"));
        out.add(Ansi.cyan("  ktv                天上人间KTV：ktv <编号> [小时] 点公主/少爷陪唱"));
        out.add(Ansi.cyan("  pv                 云水间私人会所：pv <编号> 点男/女技师按摩"));
        out.add(Ansi.cyan("  entchat <编号>     与陪侍/技师私下交流（好感≥60解锁）"));
        out.add(Ansi.cyan("  business           创业孵化中心：查看可开的店铺"));
        out.add(Ansi.cyan("  open <编号>        开店（启动资金+声望门槛）"));
        out.add(Ansi.cyan("  run                今日经营店铺（2小时，赚营收）"));
        out.add(Ansi.cyan("  upgrade            升级店铺（营收提升）｜close 转让"));
        out.add(Ansi.cyan("  npc                城里的熟人（老周/王阿姨/翠花/刘哥/大黄）"));
        out.add(Ansi.cyan("  phone              刷手机（商场买手机后解锁）"));
        out.add(Ansi.cyan("  scratch [张数]     刮刮乐 10元/张（彩票店）"));
        out.add(Ansi.cyan("  lottery buy <注>   双色球 2元/注，每日21:30开奖（彩票店）"));
        out.add(Ansi.cyan("  wholesale          小商品批发：进货摆摊（批发城）"));
        out.add(Ansi.cyan("  wholesale buy <编号> [数量]  批发进货"));
        out.add(Ansi.cyan("  stall <编号> [数量]  摆地摊卖货（大街，需先进货）"));
        out.add(Ansi.cyan("  stock              临江股市行情"));
        out.add(Ansi.cyan("  stock buy/sell <代码> <股数>  买入/卖出股票"));
        out.add(Ansi.cyan("  stock mine         我的持仓与盈亏"));
        out.add("");
        out.add(Ansi.gold("── 都市生活充实包 v1.9 ──"));
        out.add(Ansi.cyan("  weather/天气       查看今日天气（影响摆摊生意）"));
        out.add(Ansi.cyan("  quest/任务         查看今日每日任务（3个，完成自动领奖）"));
        out.add(Ansi.cyan("  gig/打零工         打零工 2 小时（大街发传单/百味鸡/菜市场/花店，每日2次）"));
        out.add(Ansi.cyan("  bargain/砍价       菜市场砍价买菜（运气决定折扣）"));
        out.add(Ansi.cyan("  arrange/插花       花店学插花（每3天魅力+1）"));
        out.add(Ansi.cyan("  battle [下注]      台球厅与凤姐对局（20~200元）"));
        out.add(Ansi.cyan("  network/应酬       会所商务应酬（200元，声望+1，有几率遇贵人）"));
        out.add(Ansi.cyan("  news/小报          大街买街头小报（1元，看趣闻运势）"));
        out.add(Ansi.cyan("  balloon/打气球     夜市打气球 10元/局（百发百中有彩蛋）"));
        out.add(Ansi.cyan("  goldfish/捞金鱼    夜市捞金鱼 10元/网（有几率捞到宠物金鱼）"));
        out.add(Ansi.cyan("  match/相亲角       公园相亲角（20元，每天1次，缘分看魅力运气）"));
        out.add(Ansi.cyan("  pigeon/喂鸽子      公园喂鸽子（2元，图一乐）"));
        out.add(Ansi.cyan("  loan               银行贷款（日息0.1%）：loan borrow <额> / loan repay <额|all>"));
        out.add(Ansi.cyan("  finance            银行理财（锁定7天日息0.15%）：finance buy <额> / finance redeem"));
        out.add(Ansi.cyan("  achievements       成就"));
        out.add("");
        out.add(Ansi.gold("── 城市烟火气 v2.0 ──"));
        out.add(Ansi.cyan("  每个地点都有「小确幸」：小卖部唠嗑/公告栏看告示/商场试衣/美食街试吃"));
        out.add(Ansi.cyan("  花店整理花材/酒吧听歌/台球厅斯诺克/会所大堂/彩票走势图/菜摊帮工"));
        out.add(Ansi.cyan("  银行大堂/4S店试驾/样板间看房/公园遛弯/逛夜市/鬼市听古话"));
        out.add(Ansi.cyan("  NPC 深度互动：帮忙/borrow 借钱/learn 请教/gossip 知心话"));
        out.add(Ansi.cyan("  打工人也有生活：在烟火气里攒心情、攒见识、攒运气"));
        out.add("");
        out.add(Ansi.gold("── 系统 ──"));
        out.add(Ansi.cyan("  pause / resume     暂停 / 继续时间"));
        out.add(Ansi.cyan("  home               家中陈设 / home buy <编号> 购置家电"));
        out.add(Ansi.cyan("  pc                 打开电脑（线上求职/股票/银行/刷剧/直播…）"));
        out.add(Ansi.cyan("  save [1-3] / load <1-3> / slots  存档/读档/槽位"));
    }

    private void status(List<String> out) {
        CharacterModel ch = state.character;
        GameConfig cfg = loader.get();
        out.add(Ansi.hr());
        out.add(Ansi.bold(genderIcon(ch.gender) + " " + ch.name)
                + Ansi.gray("  「" + eduName(cfg, ch.educationId) + " · " + perName(cfg, ch.personalityId) + "」"));
        out.add(Ansi.gray(state.dateStr() + " " + state.timeStr()
                + " · " + locName(cfg, state.locationId)
                + (state.jobId != null ? " · 职业：" + jobName(cfg, state.jobId) : " · 无业游民")));
        out.add("");
        out.add("  " + statBar("体力", ch.stamina, "34") + Ansi.cyan(" 体力 " + ch.stamina + "/100"));
        out.add("  " + statBar("饱腹", ch.hunger, "33") + Ansi.yellow(" 饱腹 " + ch.hunger + "/100"));
        out.add("  " + statBar("心情", ch.mood, "35") + Ansi.magenta(" 心情 " + ch.mood + "/100"));
        out.add("");
        out.add("  " + Ansi.red("💪 体力(力量) " + ch.str) + "   "
                + Ansi.blue("🧠 智力 " + ch.intel) + "   "
                + Ansi.pink("✨ 魅力 " + gearCharm() + "(+" + (gearCharm() - ch.charm) + ")") + "   "
                + Ansi.green("🍀 运气 " + ch.luck));
        out.add("  " + Ansi.gold("💰 现金 " + ch.money + " 元") + "   "
                + Ansi.cyan("🏦 存款 " + ch.deposit + " 元") + "   "
                + Ansi.magenta("⭐ 声望 " + gearPrestige()
                + (gearPrestige() > ch.prestige ? "(+" + (gearPrestige() - ch.prestige) + " 穿戴)" : "")));
        out.add("");
        if (state.sick) {
            out.add(Ansi.red("  🤒 你正病着（" + state.sickName + "）——体力恢复打折、心情持续下滑。去商场 buy medicine 买药！"));
        }
        if (!state.certificates.isEmpty()) {
            out.add(Ansi.green("  📜 证书：" + String.join("、", certNames())));
        }
        if (state.ownedCars.size() + state.ownedEstates.size() > 0) {
            out.add(Ansi.yellow("  🚗 车辆：" + (state.ownedCars.isEmpty() ? "无" : String.join("、", state.ownedCars))));
            out.add(Ansi.yellow("  🏠 房产：" + (state.ownedEstates.isEmpty() ? "无" : String.join("、", state.ownedEstates))));
        }
        if (state.partnerId != null) {
            NPC p = partner();
            if (p != null) {
                String rel = relationName(p.relation);
                out.add(Ansi.pink("  💕 " + rel + "：" + p.name + "（好感 " + p.affection + "/100）"));
            }
        }
        if (state.referBonus > 0) {
            out.add(Ansi.cyan("  💼 刘哥的推荐加成：下次入职薪资 +" + Math.round(state.referBonus * 100) + "%"));
        }
        if (state.fedCatDays >= 1) {
            out.add(Ansi.gray("  🐱 大黄连续投喂 " + state.fedCatDays + " 天"));
        }
        if (state.inventory.contains("goldfish")) {
            out.add(Ansi.gray("  🐟 背包里的小金鱼每天给你带来一点小确幸"));
        }
        out.add(Ansi.cyan("  " + ExtraActions.weatherIcon(state.weatherId) + " 天气：" + ExtraActions.weatherName(state.weatherId)));
        if (state.loanPrincipal > 0) {
            out.add(Ansi.yellow("  🏦 贷款本金 " + state.loanPrincipal + " 元（日息 0.1%，去银行还款）"));
        }
        if (state.financePrincipal > 0) {
            out.add(Ansi.cyan("  💰 理财持仓 " + state.financePrincipal + " 元（第 " + (state.financeStartDay + 7) + " 天到期，预计收益 " + (int) Math.floor(state.financePrincipal * 0.0015 * 7) + " 元）"));
        }
        if (!state.collegeGraduated.isEmpty()) {
            out.add(Ansi.green("  🎓 成人大学已毕业：" + String.join("、", state.collegeGraduated.stream()
                    .map(id -> AdultActions.resolve(this, id) != null ? AdultActions.resolve(this, id).name : id).toList())));
        }
        out.add(Ansi.hr());
    }

    private void move(List<String> out, String[] args) {
        if (args.length == 0) {
            out.add(Ansi.yellow("当前可前往：大街、人才市场、培训中心、成人大学、商场、美食街、花店、酒吧、台球厅、会所、KTV、私人会所、彩票店、百味鸡、地摊麻辣烫、饺子馆、火锅店、菜市场、小商品批发、银行、交易大厅、4S店、房产中介、城市公园、夜市、鬼市" + (state.jobId != null ? "、工作地点" : "") + "、住处"));
            return;
        }
        String target = args[0].toLowerCase();
        String locId = switch (target) {
            case "大街", "street" -> "street";
            case "人才市场", "jobmarket", "市场" -> "jobmarket";
            case "培训中心", "培训", "training", "学校" -> "training";
            case "成人大学", "大学", "adu", "大学城" -> "adu";
            case "商场", "mall", "万象" -> "mall";
            case "美食街", "foodstreet", "饭店" -> "foodstreet";
            case "花店", "flower", "花市" -> "flower";
            case "酒吧", "bar", "酒馆" -> "bar";
            case "台球厅", "billiards", "台球" -> "billiards";
            case "会所", "club", "俱乐部" -> "club";
            case "ktv", "k歌", "歌厅", "天上人间" -> "ktv";
            case "私人会所", "pvclub", "云水间", "spa会所" -> "pvclub";
            case "住处", "家", "home" -> "home";
            case "装修", "家具", "家电" -> "home";
            case "电脑", "pc" -> "pc";
            case "家庭", "家人", "family" -> "family";
            case "工作地点", "工作", "workplace", "公司" -> "workplace";
            case "彩票店", "彩票站", "lottery", "好运来" -> "lottery";
            case "百味鸡", "braised", "老王" -> "braised";
            case "地摊麻辣烫", "麻辣烫", "malatang" -> "malatang";
            case "饺子馆", "饺子", "dumpling" -> "dumpling";
            case "火锅店", "火锅", "hotpot", "蜀香" -> "hotpot";
            case "菜市场", "market", "菜市" -> "market";
            case "小商品批发", "批发城", "批发", "wholesale" -> "wholesale";
            case "银行", "bank", "营业部" -> "bank";
            case "交易大厅", "股市", "证券", "stock" -> "stock";
            case "4s店", "4s", "汽车店", "车行", "carshop" -> "carshop";
            case "房产中介", "房产", "中介", "买房", "estate" -> "estate";
            case "城市公园", "公园", "park" -> "park";
            case "夜市", "nightmarket", "夜宵街" -> "nightmarket";
            case "鬼市", "ghostmarket", "古玩街" -> "ghostmarket";
            default -> null;
        };
        if (locId == null) {
            out.add(Ansi.red("不认识这个地方，试试：大街/人才市场/培训中心/成人大学/商场/美食街/花店/酒吧/台球厅/会所/KTV/私人会所/住处/工作地点/彩票店/百味鸡/地摊麻辣烫/饺子馆/火锅店/菜市场/小商品批发/银行/交易大厅/4S店/房产中介/城市公园/夜市/鬼市"));
            return;
        }
        int hr = state.hour();
        if ("nightmarket".equals(locId) && !(hr >= 19 || hr < 2)) {
            out.add(Ansi.red("夜市还没开市（晚上 19 点到次日 2 点营业），现在去只有卷帘门。"));
            return;
        }
        if ("ghostmarket".equals(locId) && !(hr < 5)) {
            out.add(Ansi.red("鬼市只在凌晨 0-5 点摆摊，大白天的神秘商贩都不见影。"));
            return;
        }
        if ("home".equals(locId) && "street".equals(state.housingId) && state.ownedEstates.isEmpty()) {
            out.add(Ansi.red("你无家可归，只能在街头流浪……（先打工赚钱租房吧）"));
            return;
        }
        if ("workplace".equals(locId) && state.jobId == null) {
            out.add(Ansi.red("你还没有工作，先去人才市场看看吧。"));
            return;
        }
        if (locId.equals(state.locationId)) {
            out.add(Ansi.gray("你已经在" + locName(loader.get(), locId) + "了。"));
            return;
        }
        advanceTime(15);
        state.locationId = locId;
        changeStamina(-1);
        changeHunger(-1);
        out.add(Ansi.cyan("🚶 走了15分钟，来到" + locName(loader.get(), locId) + " " + locIcon(loader.get(), locId)));
        out.add(Ansi.gray("　" + locDesc(loader.get(), locId)));
        if ("jobmarket".equals(locId)) {
            out.add(Ansi.yellow("输入 jobs 查看招聘信息"));
        } else if ("training".equals(locId)) {
            out.add(Ansi.yellow("输入 train 查看培训课程"));
        } else if ("adu".equals(locId)) {
            out.add(Ansi.yellow("输入 college 查看成人大学班级，学历不够先来充电"));
        } else if ("mall".equals(locId)) {
            out.add(Ansi.yellow("输入 shop 逛商场"));
        } else if ("foodstreet".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 觅食"));
        } else if ("flower".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 挑一束花"));
        } else if ("bar".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 点一杯，放松放松"));
        } else if ("billiards".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 玩两局"));
        } else if ("club".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 享受会所服务"));
        } else if ("ktv".equals(locId)) {
            out.add(Ansi.yellow("输入 ktv 查看花名册，点公主/少爷陪唱（ktv <编号> [小时]），熟了可 entchat 私下聊"));
        } else if ("pvclub".equals(locId)) {
            out.add(Ansi.yellow("输入 pv 查看技师名单，点单放松（pv <编号>），熟了可 entchat 私下聊"));
        } else if ("lottery".equals(locId)) {
            out.add(Ansi.yellow("输入 scratch 刮一张，或 lottery buy 来一注"));
        } else if ("wholesale".equals(locId)) {
            out.add(Ansi.yellow("输入 wholesale 看货进货，再去大街摆摊"));
        } else if ("bank".equals(locId)) {
            out.add(Ansi.yellow("输入 bank <金额> 存钱吃利息 / withdraw <金额> 取钱"));
        } else if ("stock".equals(locId)) {
            out.add(Ansi.yellow("输入 stock 看行情，stock buy/sell <代码> <股数> 交易"));
        } else if ("carshop".equals(locId)) {
            out.add(Ansi.yellow("输入 buycar <编号> 买车（资产 tab 有购车列表）"));
        } else if ("estate".equals(locId)) {
            out.add(Ansi.yellow("输入 buyhouse <编号> 看房买房（资产 tab 有房源列表）"));
        } else if ("park".equals(locId)) {
            out.add(Ansi.yellow("输入 bj 和棋友玩21点，或 gomoku 下五子棋（可以赌钱）"));
        } else if ("nightmarket".equals(locId)) {
            out.add(Ansi.yellow("输入 eat 吃夜宵，或 ringtoss 套圈碰运气（20元3圈）"));
        } else if ("ghostmarket".equals(locId)) {
            out.add(Ansi.yellow("输入 antique 淘古董（50元赌眼力），或 fortune 求签"));
        } else if ("street".equals(locId)) {
            out.add(Ansi.yellow("输入 scrap 捡废品、social 找人聊天；手痒想搏一把，去好运来彩票站（move 彩票店）"));
        }
    }

    private void achievements(List<String> out) {
        out.add(Ansi.banner("成就系统", "已解锁 " + state.achievements.size() + "/" + loader.get().achievements.size()));
        for (GameConfig.AchievementDef a : loader.get().achievements) {
            boolean got = state.achievements.contains(a.id);
            out.add((got ? Ansi.gold("🏆 " + a.name + " ✔") : Ansi.darkGray("　 " + a.name)) + Ansi.gray(" —— " + a.desc));
        }
    }

    private CommandResult saveGameArg(String[] args) {
        int slot = args.length > 0 ? parseInt(args[0], 1) : 1;
        return saveGame(Math.min(3, Math.max(1, slot)));
    }
    private CommandResult loadGameArg(String[] args) {
        if (args.length == 0) return CommandResult.fail(Ansi.red("用法：load <1-3>"), view());
        int slot = parseInt(args[0], 1);
        return loadGame(Math.min(3, Math.max(1, slot)));
    }

    private void slots(List<String> out) {
        out.add(Ansi.banner("存档槽位", "SAVE SLOTS"));
        for (SaveService.SlotInfo s : saveService.slots()) {
            out.add((s.exists ? Ansi.green("● " + s.name) : Ansi.darkGray("○ " + s.name)) + Ansi.gray("  " + (s.exists ? s.summary : "（空）")));
        }
        if (saveService.hasAuto()) out.add(Ansi.cyan("▣ 自动存档：每日清晨自动保存"));
    }


    // ============ 成就 ============

    public void checkAchievements(List<String> out) {
        if (state == null || !state.started) return;
        CharacterModel ch = state.character;
        for (GameConfig.AchievementDef a : loader.get().achievements) {
            if (state.achievements.contains(a.id)) continue;
            int v2 = parseInt(String.valueOf(a.value), -1);
            boolean hit = switch (a.type) {
                case "money" -> ch.money >= v2;
                case "job" -> state.jobCount >= v2;
                case "cert" -> state.certificates.size() >= v2;
                case "love" -> state.partnerId != null && !"STRANGER".equals(partnerRelation());
                case "car" -> state.ownedCars.size() >= v2;
                case "estate" -> state.ownedEstates.size() >= v2;
                case "marry" -> state.married;
                case "deposit" -> ch.deposit >= v2;
                case "earn" -> state.totalEarned >= v2;
                case "bigwin" -> state.wonBigLottery;
                case "bjwin" -> state.parkBjWins >= v2;
                case "gomokuw" -> state.parkGomokuWins >= v2;
                case "night" -> state.nightMarketVisits >= v2;
                case "ghost" -> state.ghostMarketVisits >= v2;
                case "multicert" -> state.certificates.size() >= v2;
                case "newgame" -> state.newGameCount >= v2;
                // ---- v1.9 新成就 ----
                case "balloon" -> state.balloonWins >= v2;
                case "goldfish" -> state.goldfishGot >= v2;
                case "match" -> state.matchCount >= v2;
                case "quest" -> state.questCount >= v2;
                // ---- v2.0 成人大学成就 ----
                case "college" -> state.collegeGraduated.size() >= v2;
                case "education" -> GameConfig.educationRank(state.character.educationId) >= GameConfig.educationRank(String.valueOf(a.value));
                default -> false;
            };
            if (hit) {
                state.achievements.add(a.id);
                ch.mood = Math.min(100, ch.mood + 5);
                pushEvent(Ansi.gold("🏆 解锁成就【" + a.name + "】" + Ansi.gray(a.desc)));
            }
        }
    }

    // ============ HUD 视图 ============

    public synchronized Map<String, Object> view() {
        Map<String, Object> v = new LinkedHashMap<>();
        if (state == null || !state.started) {
            v.put("started", false);
            return v;
        }
        GameConfig cfg = loader.get();
        CharacterModel ch = state.character;
        v.put("started", true);
        v.put("gameOver", state.gameOver);
        v.put("gameOverReason", state.gameOverReason);
        v.put("day", state.day());
        v.put("time", state.timeStr());
        v.put("fullTime", state.fullTimeStr());
        v.put("location", locView(cfg, state.locationId));
        v.put("paused", state.paused);
        v.put("speed", state.speed);

        Map<String, Object> c = new LinkedHashMap<>();
        c.put("name", ch.name);
        c.put("gender", ch.gender);
        c.put("genderIcon", genderIcon(ch.gender));
        c.put("personality", perName(cfg, ch.personalityId));
        c.put("education", eduName(cfg, ch.educationId));
        c.put("major", majName(cfg, ch.majorId));
        v.put("char", c);

        Map<String, Object> vitals = new LinkedHashMap<>();
        vitals.put("stamina", ch.stamina);
        vitals.put("hunger", ch.hunger);
        vitals.put("mood", ch.mood);
        v.put("vitals", vitals);

        Map<String, Object> skills = new LinkedHashMap<>();
        skills.put("str", ch.str);
        skills.put("intel", ch.intel);
        skills.put("charm", gearCharm());
        skills.put("baseCharm", ch.charm);
        skills.put("luck", ch.luck);
        v.put("skills", skills);

        v.put("money", ch.money);
        v.put("deposit", ch.deposit);
        v.put("prestige", gearPrestige());

        if (state.jobId != null) {
            GameConfig.JobDef j = loader.job(state.jobId);
            if (j != null) {
                Map<String, Object> jv = new LinkedHashMap<>();
                jv.put("id", j.id);
                jv.put("name", j.name);
                jv.put("daily", j.daily);
                jv.put("type", j.type);
                jv.put("growAttr", j.growAttr);
                v.put("job", jv);
            } else {
                v.put("job", null);
            }
        } else {
            v.put("job", null);
        }

        v.put("certs", certNames());
        List<Map<String, Object>> bagList = new ArrayList<>();
        for (String id : state.inventory) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it == null) continue;
            Map<String, Object> bv = new LinkedHashMap<>();
            bv.put("id", it.id);
            bv.put("name", it.name);
            bv.put("category", it.category);
            bv.put("cost", it.cost);
            bv.put("charm", it.charm);
            bv.put("prestige", it.prestige);
            bv.put("mood", it.mood);
            bv.put("socialBonus", it.socialBonus);
            bv.put("desc", it.desc);
            bv.put("on", state.equipped.contains(it.id));
            bagList.add(bv);
        }
        // 夜市捞到的宠物金鱼（特殊道具，非商场商品）
        if (state.inventory.contains("goldfish")) {
            Map<String, Object> gf = new LinkedHashMap<>();
            gf.put("id", "goldfish");
            gf.put("name", "小金鱼");
            gf.put("category", "pet");
            gf.put("cost", 0);
            gf.put("charm", 0);
            gf.put("prestige", 0);
            gf.put("mood", 1);
            gf.put("socialBonus", 0);
            gf.put("desc", "夜市捞到的小金鱼，每天清晨给你带来一点小确幸（心情+1）");
            gf.put("on", true);
            bagList.add(gf);
        }
        v.put("inventory", bagList);
        v.put("equipped", state.equipped == null ? new java.util.ArrayList<>() : state.equipped);
        v.put("courseProgress", state.courseProgress == null ? new java.util.HashMap<>() : new java.util.HashMap<>(state.courseProgress));
        v.put("housing", housingName(cfg, state.housingId) + (state.leaseDays > 0 ? "（剩" + state.leaseDays + "天）" : ""));
        v.put("estates", new ArrayList<>(state.ownedEstates));
        v.put("cars", new ArrayList<>(state.ownedCars));
        v.put("homeItems", new ArrayList<>(state.homeItems));
        // 玩家最佳电脑/电视信息（前端判断是否展示电脑桌面入口）
        GameConfig.HomeItemDef bp = HomeActions.bestPc(this);
        if (bp != null) {
            Map<String, Object> pcv = new LinkedHashMap<>();
            pcv.put("id", bp.id);
            pcv.put("name", bp.name);
            pcv.put("brand", bp.brand);
            pcv.put("level", bp.level);
            pcv.put("desc", bp.desc);
            pcv.put("unlock", bp.unlock);
            v.put("pc", pcv);
        }
        GameConfig.HomeItemDef btv = HomeActions.bestTv(this);
        if (btv != null) {
            Map<String, Object> tvv = new LinkedHashMap<>();
            tvv.put("id", btv.id);
            tvv.put("name", btv.name);
            tvv.put("level", btv.level);
            v.put("tv", tvv);
        }

        NPC p = partner();
        if (p != null) {
            Map<String, Object> pv = new LinkedHashMap<>();
            pv.put("name", p.name);
            pv.put("gender", p.gender);
            pv.put("profession", p.profession);
            pv.put("relation", p.relation);
            pv.put("relationCn", relationName(p.relation));
            pv.put("affection", p.affection);
            v.put("partner", pv);
        } else {
            v.put("partner", null);
        }

        List<Map<String, Object>> npcs = new ArrayList<>();
        for (NPC n : state.npcs) {
            Map<String, Object> nv = new LinkedHashMap<>();
            nv.put("id", n.id);
            nv.put("name", n.name);
            nv.put("gender", n.gender);
            nv.put("profession", n.profession);
            nv.put("relation", relationName(n.relation));
            nv.put("affection", n.affection);
            nv.put("source", n.source);
            npcs.add(nv);
        }
        v.put("npcs", npcs);
        v.put("achievementCount", state.achievements.size());
        v.put("achievementTotal", cfg.achievements.size());
        // 已获证书（id + 名称 + 图标）
        List<Map<String, Object>> certs = new ArrayList<>();
        for (GameConfig.CourseDef cc : cfg.courses) {
            if (state.certificates.contains(cc.certId)) {
                Map<String, Object> cv = new LinkedHashMap<>();
                cv.put("id", cc.id);
                cv.put("name", cc.certName);
                cv.put("icon", cc.certIcon == null ? "📜" : cc.certIcon);
                certs.add(cv);
            }
        }
        v.put("certificates", certs);
        // 创业店铺
        GameConfig.BusinessDef curBiz = state.bizId == null ? null
                : cfg.businesses.stream().filter(x -> x.id.equals(state.bizId)).findFirst().orElse(null);
        if (curBiz != null) {
            Map<String, Object> bv = new LinkedHashMap<>();
            bv.put("id", curBiz.id);
            bv.put("name", curBiz.name);
            bv.put("icon", curBiz.icon);
            bv.put("level", state.bizLevel);
            bv.put("revenue", state.bizRevenue);
            bv.put("openedDay", state.bizOpenedDay);
            bv.put("lastRunDay", state.bizLastRunDay);
            v.put("business", bv);
        } else {
            v.put("business", null);
        }
        // 批发库存（摆摊货源）
        List<Map<String, Object>> ws = new ArrayList<>();
        if (!state.wholesaleStock.isEmpty()) {
            for (GameConfig.WholesaleDef w : cfg.wholesale) {
                int have = state.wholesaleStock.getOrDefault(w.id, 0);
                if (have <= 0) continue;
                Map<String, Object> wm = new LinkedHashMap<>();
                wm.put("id", w.id);
                wm.put("name", w.name);
                wm.put("icon", w.icon);
                wm.put("unit", w.unit);
                wm.put("sellBase", w.sellBase);
                wm.put("stock", have);
                ws.add(wm);
            }
        }
        v.put("wholesaleStock", ws);
        // 公园牌局/棋局状态（前端弹窗渲染）
        if (state.blackjack != null) {
            Map<String, Object> bj = new LinkedHashMap<>();
            bj.put("phase", state.blackjack.phase);
            bj.put("bet", state.blackjack.bet);
            bj.put("player", new ArrayList<>(state.blackjack.player));
            bj.put("dealer", new ArrayList<>(state.blackjack.dealer));
            bj.put("playerScore", state.blackjack.playerScore());
            bj.put("dealerScore", state.blackjack.dealerScore());
            bj.put("playerStand", state.blackjack.playerStand);
            bj.put("result", state.blackjack.result);
            bj.put("payout", state.blackjack.payout);
            v.put("blackjack", bj);
        } else {
            v.put("blackjack", null);
        }
        if (state.gomoku != null) {
            Map<String, Object> go = new LinkedHashMap<>();
            go.put("phase", state.gomoku.phase);
            go.put("bet", state.gomoku.bet);
            go.put("board", state.gomoku.board);
            go.put("playerTurn", state.gomoku.playerTurn);
            go.put("result", state.gomoku.result);
            go.put("payout", state.gomoku.payout);
            v.put("gomoku", go);
        } else {
            v.put("gomoku", null);
        }
        // ---- v1.9：天气 / 贷款 / 理财 / 每日任务 ----
        Map<String, Object> wx = new LinkedHashMap<>();
        wx.put("id", state.weatherId == null ? "sunny" : state.weatherId);
        wx.put("name", ExtraActions.weatherName(state.weatherId));
        wx.put("icon", ExtraActions.weatherIcon(state.weatherId));
        wx.put("desc", ExtraActions.weatherDesc(state.weatherId));
        v.put("weather", wx);
        Map<String, Object> loan = new LinkedHashMap<>();
        loan.put("principal", state.loanPrincipal);
        loan.put("dailyInterest", (int) Math.ceil(state.loanPrincipal * 0.001));
        loan.put("limit", 50000);
        loan.put("startDay", state.loanStartDay);
        v.put("loan", loan);
        Map<String, Object> finance = new LinkedHashMap<>();
        finance.put("principal", state.financePrincipal);
        finance.put("startDay", state.financeStartDay);
        finance.put("dueDay", state.financeStartDay >= 0 ? state.financeStartDay + 7 : -1);
        finance.put("estInterest", state.financePrincipal > 0 ? (int) Math.floor(state.financePrincipal * 0.0015 * 7) : 0);
        finance.put("min", 1000);
        finance.put("days", 7);
        v.put("finance", finance);
        List<Map<String, Object>> quests = new ArrayList<>();
        if (state.quests != null) {
            for (GameState.Quest q : state.quests) {
                Map<String, Object> qv = new LinkedHashMap<>();
                qv.put("id", q.id);
                qv.put("desc", q.desc);
                qv.put("type", q.type);
                qv.put("target", q.target);
                qv.put("cur", q.cur);
                qv.put("done", q.done);
                qv.put("reward", q.reward);
                qv.put("mood", q.mood);
                quests.add(qv);
            }
        }
        v.put("quests", quests);
        v.put("questDay", state.questDay);
        v.put("questCount", state.questCount);
        // ---- v2.0 成人大学视图 ----
        List<Map<String, Object>> col = new ArrayList<>();
        if (cfg.adultClasses != null) {
            for (GameConfig.AdultClassDef cc : cfg.adultClasses) {
                Map<String, Object> cv = new LinkedHashMap<>();
                cv.put("id", cc.id);
                cv.put("name", cc.name);
                cv.put("icon", cc.icon == null ? "🎓" : cc.icon);
                cv.put("desc", cc.desc);
                cv.put("cost", cc.cost);
                cv.put("examFee", cc.examFee);
                cv.put("minIntel", cc.minIntel);
                cv.put("hours", cc.hours);
                cv.put("fromEducation", cc.fromEducation);
                cv.put("toEducation", cc.toEducation);
                cv.put("major", cc.major);
                cv.put("fromEducationName", AdultActions.eduName(this, cc.fromEducation));
                cv.put("toEducationName", AdultActions.eduName(this, cc.toEducation));
                cv.put("majorName", cc.major == null || cc.major.isBlank() ? "" : majName(cfg, cc.major));
                cv.put("graduated", state.collegeGraduated.contains(cc.id));
                cv.put("progress", state.collegeProgress.containsKey(cc.id) ? state.collegeProgress.get(cc.id) : null);
                col.add(cv);
            }
        }
        v.put("college", col);
        v.put("collegeGraduated", state.collegeGraduated);
        v.put("eventLog", new ArrayList<>(state.eventLog.subList(Math.max(0, state.eventLog.size() - 8), state.eventLog.size())));
        // ---- v2.2 娱乐场所 / 车辆 ----
        List<Map<String, Object>> ents = new ArrayList<>();
        for (EntertainmentActions.EntDef e : EntertainmentActions.ENTS) {
            Map<String, Object> ev = new LinkedHashMap<>();
            ev.put("id", e.id); ev.put("name", e.name); ev.put("gender", e.gender);
            ev.put("role", e.role); ev.put("loc", e.loc); ev.put("price", e.price);
            ev.put("style", e.style);
            ev.put("affection", state.entAffection.getOrDefault(e.id, 0));
            ev.put("chatToday", state.entChatDay.getOrDefault(e.id, 0));
            ents.add(ev);
        }
        v.put("ents", ents);
        GameConfig.CarDef bestCar = CarActions.bestCar(this);
        if (bestCar != null) {
            Map<String, Object> cv2 = new LinkedHashMap<>();
            cv2.put("id", bestCar.id);
            cv2.put("name", bestCar.name);
            cv2.put("tier", bestCar.cost >= 100000 ? 2 : bestCar.cost >= 10000 ? 1 : 0);
            v.put("bestCar", cv2);
        } else {
            v.put("bestCar", null);
        }
        v.put("carStats", java.util.Map.of(
                "drive", state.carDriveCount, "taxiEarn", state.carTaxiEarn, "race", state.carRaceCount));
        v.put("marriage", java.util.Map.of(
                "married", state.married, "marriedDay", state.marriedDay));
        v.put("socialRank", SocialActions.attitudeRank(this));
        v.put("market", marketView());
        return v;
    }

    private Map<String, Object> marketView() {
        return marketView(true);
    }

    private Map<String, Object> marketView(boolean withHistory) {
        Map<String, Object> m = new LinkedHashMap<>();
        List<Map<String, Object>> qs = new ArrayList<>();
        for (GameState.StockQuote q : state.market) {
            Map<String, Object> qv = new LinkedHashMap<>();
            qv.put("code", q.code); qv.put("name", q.name); qv.put("sector", q.sector);
            qv.put("icon", q.icon); qv.put("desc", q.desc);
            qv.put("price", q.price);
            qv.put("dayOpen", q.dayOpen);
            qv.put("chg", Math.round(q.dayChangePct() * 100.0) / 100.0);
            if (withHistory) qv.put("history", new ArrayList<>(q.history));
            qs.add(qv);
        }
        m.put("quotes", qs);
        List<Map<String, Object>> hs = new ArrayList<>();
        for (GameState.StockHolding h : state.holdings) {
            GameState.StockQuote q = stockQuote(h.code);
            Map<String, Object> hv = new LinkedHashMap<>();
            hv.put("code", h.code); hv.put("name", q != null ? q.name : h.code);
            hv.put("shares", h.shares);
            hv.put("cost", Math.round(h.totalCost * 100.0) / 100.0);
            hv.put("price", q != null ? q.price : 0);
            hs.add(hv);
        }
        m.put("holdings", hs);
        m.put("cash", state.character.money);
        return m;
    }

    private Map<String, Object> locView(GameConfig cfg, String id) {
        Map<String, Object> m = new LinkedHashMap<>();
        GameConfig.LocationDef l = cfg.locations.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
        if (l == null) {
            m.put("id", id); m.put("name", id); m.put("img", ""); m.put("icon", "📍");
            return m;
        }
        m.put("id", l.id); m.put("name", l.name); m.put("img", l.img); m.put("icon", l.icon); m.put("desc", l.desc);
        return m;
    }

    /** 取出并清空待推送事件（前端轮询时写入终端） */
    public synchronized List<String> drainEvents() {
        if (state == null) return java.util.Collections.emptyList();
        List<String> ev = new ArrayList<>(state.eventQueue);
        state.eventQueue.clear();
        return ev;
    }

    // ============ SSE 实时推送 ============

    /** 注册一个新的 SSE 订阅客户端（GameApiController /stream 调用） */
    public SseEmitter openSse() {
        SseEmitter em = new SseEmitter(SSE_CLIENT_TIMEOUT_MS);   // 超时自动断开清理僵尸连接（前端自动重连）
        em.onCompletion(() -> sseClients.remove(em));
        em.onTimeout(() -> { sseClients.remove(em); em.complete(); });
        em.onError(e -> sseClients.remove(em));
        sseClients.add(em);
        // 连接建立立即推送一次最新状态
        try {
            em.send(SseEmitter.event().name("state").data(statePayload()));
        } catch (IOException ignored) {
            sseClients.remove(em);
        }
        return em;
    }

    private Map<String, Object> statePayload() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hud", viewLight());
        m.put("lines", drainEvents());
        return m;
    }

    /** 状态变更后调用：向所有 SSE 客户端推送（限流合并高频变更） */
    public void pushState() {
        if (sseClients.isEmpty()) return;
        long now = System.nanoTime();
        boolean heartbeat = now - lastPushNanos >= SSE_HEARTBEAT_NANOS;
        if (now - lastPushNanos < SSE_MIN_INTERVAL_NANOS && !heartbeat) return;
        lastPushNanos = now;
        Map<String, Object> payload = statePayload();
        for (SseEmitter em : sseClients) {
            try {
                em.send(SseEmitter.event().name("state").data(payload));
            } catch (Exception ex) {
                sseClients.remove(em);
            }
        }
    }

    /** SSE 轻量视图：仅高频变化字段（vitals/skills/金钱/时间/位置/行情）。
        低频字段（背包/NPC/证书/房产/车辆/电脑/小游戏等）不随 SSE 推送，
        由页面初始化 GET /api/game/state 全量拉取一次、操作命令返回的完整 hud 增量更新。 */
    public synchronized Map<String, Object> viewLight() {
        Map<String, Object> v = new LinkedHashMap<>();
        if (state == null || !state.started) {
            v.put("started", false);
            return v;
        }
        GameConfig cfg = loader.get();
        CharacterModel ch = state.character;
        v.put("started", true);
        v.put("gameOver", state.gameOver);
        v.put("gameOverReason", state.gameOverReason);
        v.put("day", state.day());
        v.put("time", state.timeStr());
        v.put("fullTime", state.fullTimeStr());
        v.put("location", locView(cfg, state.locationId));
        v.put("paused", state.paused);
        v.put("speed", state.speed);

        Map<String, Object> c = new LinkedHashMap<>();
        c.put("name", ch.name);
        c.put("gender", ch.gender);
        c.put("genderIcon", genderIcon(ch.gender));
        c.put("personality", perName(cfg, ch.personalityId));
        c.put("education", eduName(cfg, ch.educationId));
        c.put("major", majName(cfg, ch.majorId));
        v.put("char", c);

        Map<String, Object> vitals = new LinkedHashMap<>();
        vitals.put("stamina", ch.stamina);
        vitals.put("hunger", ch.hunger);
        vitals.put("mood", ch.mood);
        v.put("vitals", vitals);

        Map<String, Object> skills = new LinkedHashMap<>();
        skills.put("str", ch.str);
        skills.put("intel", ch.intel);
        skills.put("charm", gearCharm());
        skills.put("baseCharm", ch.charm);
        skills.put("luck", ch.luck);
        v.put("skills", skills);

        v.put("money", ch.money);
        v.put("deposit", ch.deposit);
        v.put("prestige", gearPrestige());

        if (state.jobId != null) {
            GameConfig.JobDef j = loader.job(state.jobId);
            if (j != null) {
                Map<String, Object> jv = new LinkedHashMap<>();
                jv.put("id", j.id);
                jv.put("name", j.name);
                jv.put("daily", j.daily);
                jv.put("type", j.type);
                jv.put("growAttr", j.growAttr);
                v.put("job", jv);
            } else {
                v.put("job", null);
            }
        } else {
            v.put("job", null);
        }

        v.put("housing", housingName(cfg, state.housingId) + (state.leaseDays > 0 ? "（剩" + state.leaseDays + "天）" : ""));
        v.put("achievementCount", state.achievements.size());
        v.put("achievementTotal", cfg.achievements.size());
        v.put("market", marketView(false));
        // ---- v1.9：天气 / 贷款 / 理财（轻量推送） ----
        Map<String, Object> wx = new LinkedHashMap<>();
        wx.put("id", state.weatherId == null ? "sunny" : state.weatherId);
        wx.put("name", ExtraActions.weatherName(state.weatherId));
        wx.put("icon", ExtraActions.weatherIcon(state.weatherId));
        v.put("weather", wx);
        Map<String, Object> loan = new LinkedHashMap<>();
        loan.put("principal", state.loanPrincipal);
        loan.put("dailyInterest", (int) Math.ceil(state.loanPrincipal * 0.001));
        v.put("loan", loan);
        Map<String, Object> finance = new LinkedHashMap<>();
        finance.put("principal", state.financePrincipal);
        finance.put("dueDay", state.financeStartDay >= 0 ? state.financeStartDay + 7 : -1);
        v.put("finance", finance);
        return v;
    }

    // ============ 数值变更辅助 ============

    public void advanceTime(int minutes) {
        state.gameMinutes += minutes;
    }
    public void addMoney(int delta) {
        state.character.money += delta;
    }
    public void changeStamina(int d) {
        state.character.stamina = Math.max(0, Math.min(100, state.character.stamina + d));
    }
    public void changeHunger(int d) {
        state.character.hunger = Math.max(0, Math.min(100, state.character.hunger + d));
    }
    public void changeMood(int d) {
        state.character.mood = Math.max(0, Math.min(100, state.character.mood + d));
    }
    public void changePrestige(int d) {
        state.character.prestige = Math.max(0, state.character.prestige + d);
    }
    public void pushEvent(String line) {
        state.eventQueue.add(line);
        state.eventLog.add(Ansi.plain(line));
        if (state.eventLog.size() > 50) {
            state.eventLog = new ArrayList<>(state.eventLog.subList(state.eventLog.size() - 50, state.eventLog.size()));
        }
        if (state.eventQueue.size() > 40) {
            state.eventQueue = new ArrayList<>(state.eventQueue.subList(state.eventQueue.size() - 40, state.eventQueue.size()));
        }
    }

    /** 穿戴加成后的总魅力（仅统计穿戴中 + 宠物） */
    public int gearCharm() {
        CharacterModel ch = state.character;
        int gear = 0;
        for (String id : equippedPlusPets()) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it != null) gear += it.charm;
        }
        return ch.charmWithGear(gear);
    }

    /** 穿戴加成后的总声望（基础声望 + 穿戴物品声望） */
    public int gearPrestige() {
        int gear = 0;
        for (String id : equippedPlusPets()) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it != null) gear += it.prestige;
        }
        return Math.max(0, state.character.prestige + gear);
    }

    /** 穿戴物品的每日心情加成（含宠物小金鱼） */
    public int gearMoodBonus() {
        int m = 0;
        for (String id : equippedPlusPets()) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it != null) m += it.mood;
        }
        if (state.inventory.contains("goldfish")) m += 1;
        return m;
    }

    /** 是否可穿戴（衣服/裤子/鞋子/手表/数码/配饰/宠物，同类互斥） */
    public boolean isWearable(String category) {
        return "clothes".equals(category) || "pants".equals(category)
                || "shoes".equals(category) || "watch".equals(category)
                || "digital".equals(category) || "accessory".equals(category)
                || "pet".equals(category);
    }

    /** 穿戴中物品 + 宠物（宠物无需穿戴，拥有即陪伴生效） */
    private List<String> equippedPlusPets() {
        List<String> all = new ArrayList<>(state.equipped);
        for (String id : state.inventory) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it != null && "pet".equals(it.category) && !all.contains(id)) all.add(id);
        }
        return all;
    }

    /** 交通工具对配送类工作的加成 */
    public double transportBonus() {
        double best = 0;
        for (String id : state.ownedCars) {
            GameConfig.CarDef c = loader.car(id);
            if (c != null) best = Math.max(best, c.deliveryBonus);
        }
        return best;
    }

    public double socialBonus() {
        double b = 0;
        for (String id : equippedPlusPets()) {
            GameConfig.MallItemDef it = loader.item(id);
            if (it != null) b += it.socialBonus;
        }
        for (String id : state.ownedCars) {
            GameConfig.CarDef c = loader.car(id);
            if (c != null) b += c.socialBonus;
        }
        return b;
    }

    public GameConfig.PersonalityDef personality() {
        return loader.get().personalities.stream().filter(p -> p.id.equals(state.character.personalityId)).findFirst().orElse(null);
    }
    public GameConfig.MajorDef major() {
        return loader.get().majors.stream().filter(m -> m.id.equals(state.character.majorId)).findFirst().orElse(null);
    }
    public double personalityLearnBonus() {
        GameConfig.PersonalityDef p = personality();
        return p != null ? p.learnBonus : 0;
    }
    public double personalitySocialBonus() {
        GameConfig.PersonalityDef p = personality();
        return p != null ? p.socialBonus : 0;
    }
    public double personalityWorkBonus() {
        GameConfig.PersonalityDef p = personality();
        return p != null ? p.workBonus : 0;
    }

    public NPC partner() {
        if (state.partnerId == null) return null;
        return state.npcs.stream().filter(n -> n.id.equals(state.partnerId)).findFirst().orElse(null);
    }
    public String partnerRelation() {
        NPC p = partner();
        return p == null ? "STRANGER" : p.relation;
    }

    public GameConfig.JobDef curJob() {
        return loader.job(state.jobId);
    }

    public List<String> certNames() {
        List<String> names = new ArrayList<>();
        for (String certId : state.certificates) {
            String nm = loader.get().courses.stream().filter(c -> certId.equals(c.certId))
                    .findFirst().map(c -> c.certName).orElse(certId);
            names.add(nm);
        }
        return names;
    }

    public static int parseInt(String s, int def) {
        try {
            return Integer.parseInt(s.trim());
        } catch (Exception e) {
            return def;
        }
    }

    /** 通用列表分页：full 为全量输出行，args[0] 为页码（缺省 1），返回带页脚的当页内容 */
    public List<String> paginate(String cmdName, List<String> full, String[] args, int pageSize) {
        int page = args.length > 0 ? parseInt(args[0], 1) : 1;
        int total = full.size();
        int pages = Math.max(1, (int) Math.ceil(total / (double) pageSize));
        if (page < 1) page = 1;
        if (page > pages) page = pages;
        int from = (page - 1) * pageSize;
        List<String> out = new ArrayList<>(full.subList(from, Math.min(from + pageSize, total)));
        if (pages > 1) {
            out.add("");
            out.add(Ansi.darkGray("　── 第 " + page + " / " + pages + " 页（共 " + total + " 行）──"));
            if (page < pages) out.add(Ansi.yellow("　输入 " + cmdName + " " + (page + 1) + " 查看下一页"));
            else if (page > 1) out.add(Ansi.yellow("　输入 " + cmdName + " 1 返回第一页"));
        }
        return out;
    }

    // ============ 名称查询 ============

    public String locName(GameConfig cfg, String id) {
        return cfg.locations.stream().filter(l -> l.id.equals(id)).findFirst().map(l -> l.name).orElse(id);
    }
    public String locIcon(GameConfig cfg, String id) {
        return cfg.locations.stream().filter(l -> l.id.equals(id)).findFirst().map(l -> l.icon).orElse("📍");
    }
    public String locDesc(GameConfig cfg, String id) {
        return cfg.locations.stream().filter(l -> l.id.equals(id)).findFirst().map(l -> l.desc).orElse("");
    }
    public String jobName(GameConfig cfg, String id) {
        return cfg.jobs.stream().filter(j -> j.id.equals(id)).findFirst().map(j -> j.name).orElse(id);
    }
    public String eduName(GameConfig cfg, String id) {
        return cfg.education.stream().filter(e -> e.id.equals(id)).findFirst().map(e -> e.name).orElse(id);
    }
    public String perName(GameConfig cfg, String id) {
        return cfg.personalities.stream().filter(p -> p.id.equals(id)).findFirst().map(p -> p.name).orElse(id);
    }
    public String majName(GameConfig cfg, String id) {
        return cfg.majors.stream().filter(m -> m.id.equals(id)).findFirst().map(m -> m.name).orElse(id);
    }
    public String housingName(GameConfig cfg, String id) {
        return cfg.housing.stream().filter(h -> h.id.equals(id)).findFirst().map(h -> h.name).orElse(id);
    }
    public String relationName(String rel) {
        return switch (rel) {
            case "STRANGER" -> "陌生人";
            case "FRIEND" -> "朋友";
            case "CRUSH" -> "暧昧";
            case "LOVER" -> "恋人";
            case "FIANCEE" -> "未婚妻/夫";
            case "SPOUSE" -> "配偶";
            default -> rel;
        };
    }
    public static String genderIcon(String gender) {
        return "male".equals(gender) ? "👨" : "👩";
    }
    public static String statBar(String label, int val, String color) {
        int n = Math.max(0, Math.min(20, val / 5));
        String filled = "\u001b[" + color + "m" + "█".repeat(n) + "\u001b[0m";
        String empty = "\u001b[2m" + "░".repeat(20 - n) + "\u001b[0m";
        return filled + empty;
    }
    public String npcNameWithTitle(NPC npc) {
        return npc.name + "（" + npc.profession + "）";
    }

    // ============ 股票市场 ============

    public void initMarket() {
        GameConfig cfg = loader.get();
        state.market.clear();
        if (cfg.stocks == null) return;
        for (GameConfig.StockDef d : cfg.stocks) {
            GameState.StockQuote q = new GameState.StockQuote();
            q.code = d.code; q.name = d.name; q.sector = d.sector;
            q.icon = d.icon; q.desc = d.desc; q.volatility = d.volatility;
            q.price = Math.round(d.basePrice * (0.88 + rnd.nextDouble() * 0.24) * 100.0) / 100.0;
            q.dayOpen = q.price;
            q.history.add(q.price);
            state.market.add(q);
        }
    }

    private void stockStep() {
        if (state.market.isEmpty()) return;
        if (state.day() != lastStockDay) {
            lastStockDay = state.day();
            for (GameState.StockQuote q : state.market) q.dayOpen = q.price;
        }
        for (GameState.StockQuote q : state.market) {
            double drift = (rnd.nextDouble() * 2 - 1) * q.volatility;
            double maxMove = q.price * 0.05;
            double mv = Math.max(-maxMove, Math.min(maxMove, q.price * drift));
            q.price = Math.max(0.5, Math.round((q.price + mv) * 100.0) / 100.0);
            q.history.add(q.price);
            if (q.history.size() > 60) q.history.remove(0);
        }
    }

    public GameState.StockQuote stockQuote(String code) {
        return state.market.stream().filter(q -> q.code.equalsIgnoreCase(code)).findFirst().orElse(null);
    }

    // ============ 固定 NPC ============

    private void initFixedNpcs() {
        if (state.npcs == null) state.npcs = new ArrayList<>();
        state.npcs.removeIf(n -> n.isFixed);
        state.npcs.add(fixedNpc("老周", "male", "工头", "爽快，认死理", "foreman", 5));
        state.npcs.add(fixedNpc("王阿姨", "female", "房东", "热心肠，爱唠叨", "landlady", 8));
        state.npcs.add(fixedNpc("翠花", "female", "小吃摊老板娘", "刀子嘴豆腐心", "madam", 8));
        state.npcs.add(fixedNpc("刘哥", "male", "劳务中介", "精明，消息灵通", "agent", 3));
        state.npcs.add(fixedNpc("大黄", "male", "流浪猫", "高冷又粘人", "cat", 12));
        state.npcs.add(fixedNpc("老李", "male", "公园棋友", "棋瘾大，爱争输赢", "chess", 10));
        state.npcs.add(fixedNpc("张叔", "male", "公园牌友", "嘴碎，牌品一般", "cards", 10));
        state.npcs.add(fixedNpc("胖姐", "female", "夜市老板娘", "嗓门大，心肠热", "nightboss", 10));
        state.npcs.add(fixedNpc("老瞎子", "male", "鬼市商贩", "神神叨叨，摸不清底细", "ghostboss", 5));
        addShopNpcs();
    }

    /** 商铺 NPC：在对应地点消费可互动提升好感（男女混合） */
    private void addShopNpcs() {
        if (state.npcs == null) state.npcs = new ArrayList<>();
        addShopNpcIfMissing("老陈", "male", "烤红薯摊主", "憨厚，实在", "shop-street", 6);
        addShopNpcIfMissing("张姐", "female", "商场售货员", "热情，嘴甜", "shop-mall", 6);
        addShopNpcIfMissing("小雨", "female", "花店老板", "温柔，爱笑", "shop-flower", 6);
        addShopNpcIfMissing("阿哲", "male", "调酒师", "话不多，眼神有故事", "shop-bar", 4);
        addShopNpcIfMissing("凤姐", "female", "台球厅老板娘", "泼辣，牌桌常胜", "shop-billiards", 5);
        addShopNpcIfMissing("红姐", "female", "会所经理", "八面玲珑，见人说人话", "shop-club", 3);
        addShopNpcIfMissing("老王", "male", "百味鸡老板", "嗓门大，卤味一绝", "shop-braised", 6);
    }

    private void addShopNpcIfMissing(String name, String gender, String prof, String pers, String role, int aff) {
        if (state.npcs.stream().anyMatch(n -> n.isFixed && role.equals(n.role))) return;
        state.npcs.add(fixedNpc(name, gender, prof, pers, role, aff));
    }

    /** 消费互动：在对应地点消费后与店主互动提升好感（每日最多 2 次） */
    public void shopNpcInteract(List<String> out, String locationId, String itemName) {
        String role = "shop-" + locationId;
        NPC n = state.npcs.stream().filter(x -> x.isFixed && role.equals(x.role)).findFirst().orElse(null);
        if (n == null) return;
        if (n.lastInteractDay != state.day()) n.shopInteractCount = 0;
        n.lastInteractDay = state.day();
        if (n.shopInteractCount < 2) {
            n.shopInteractCount++;
            n.affection = Math.min(100, n.affection + 1);
            out.add(Ansi.gray("　💬 " + n.name + "（" + n.profession + "）：「" + shopLine(n, itemName) + "」好感 +1"));
        } else {
            out.add(Ansi.gray("　💬 " + n.name + "（" + n.profession + "）朝你点头笑了笑，熟客的默契。"));
        }
    }

    private String shopLine(NPC n, String itemName) {
        String[] lines = {
            "慢走，常来啊！",
            "你眼光真好，会挑！",
            "下回还来，给你留点好的。",
            "都是街坊，给你算实在价。",
            "这" + (itemName == null ? "东西" : itemName) + "你买对了！",
            "得嘞！下次有需要吱一声。"
        };
        return lines[rnd.nextInt(lines.length)];
    }

    private NPC fixedNpc(String name, String gender, String prof, String pers, String role, int aff) {
        NPC n = new NPC();
        n.id = "fixed-" + role;
        n.name = name; n.gender = gender;
        n.age = role.equals("cat") ? 3 : 35 + rnd.nextInt(25);
        n.profession = prof; n.personality = pers;
        n.charm = 10; n.affection = aff;
        n.relation = "FRIEND"; n.source = "fixed";
        n.isFixed = true; n.role = role;
        return n;
    }

    // ============ 随机事件 ============

    private void rollRandomEvent() {
        GameConfig cfg = loader.get();
        CharacterModel ch = state.character;
        List<GameConfig.EventDef> pool = new ArrayList<>();
        for (GameConfig.EventDef e : cfg.events) {
            if (e.requiresLocation != null && !e.requiresLocation.equals(state.locationId)) continue;
            if (e.requiresJob && state.jobId == null) continue;
            pool.add(e);
        }
        if (pool.isEmpty()) return;
        int total = pool.stream().mapToInt(e -> e.weight).sum();
        int roll = rnd.nextInt(Math.max(1, total));
        GameConfig.EventDef e = null;
        for (GameConfig.EventDef x : pool) {
            roll -= x.weight;
            if (roll < 0) { e = x; break; }
        }
        if (e == null) return;

        // 运气修正命中概率（luckEffect>0 的事件更易在运气高时出现，反之亦然）
        double luckAdj = e.luckEffect * (ch.luck - 30) / 100.0;
        if (rnd.nextDouble() > 0.55 + luckAdj) return;

        StringBuilder sb = new StringBuilder();
        sb.append(e.desc.startsWith("「") ? "" : "");
        sb.append(e.desc);
        pushEvent(Ansi.yellow("🌆 " + e.desc));
        if (e.moneyMin != 0 || e.moneyMax != 0) {
            int delta = e.moneyMin == e.moneyMax ? e.moneyMin : e.moneyMin + rnd.nextInt(Math.max(1, e.moneyMax - e.moneyMin + 1));
            ch.money += delta;
            pushEvent(Ansi.gray("　资金 " + (delta >= 0 ? "+" : "") + delta + " 元"));
        }
        if (e.stamina != 0) changeStamina(e.stamina);
        if (e.mood != 0) changeMood(e.mood);
        if (e.hunger != 0) changeHunger(e.hunger);
        if (e.learnProgress > 0) {
            for (String cid : state.courseProgress.keySet()) {
                state.courseProgress.put(cid, Math.min(100, state.courseProgress.get(cid) + e.learnProgress));
            }
        }
    }

    /** 生成社交 NPC */
    public NPC buildNpc(String source) {
        GameConfig cfg = loader.get();
        NPC n = new NPC();
        n.id = "npc_" + System.currentTimeMillis() + "_" + rnd.nextInt(9999);
        boolean opposite = rnd.nextDouble() < 0.7;
        n.gender = opposite ? ("male".equals(state.character.gender) ? "female" : "male")
                            : state.character.gender;
        n.name = randomName(n.gender);
        n.age = 18 + rnd.nextInt(20);
        n.profession = cfg.npcProfessions.get(rnd.nextInt(cfg.npcProfessions.size()));
        n.personality = cfg.personalities.get(rnd.nextInt(cfg.personalities.size())).name;
        n.charm = 30 + rnd.nextInt(50);
        n.affection = 10 + rnd.nextInt(15);
        n.relation = "STRANGER";
        n.source = source;
        n.lastInteractDay = state.day();
        return n;
    }

    public String randomName(String gender) {
        GameConfig.NpcNamesDef names = loader.get().npcNames;
        String surname = names.surnames.get(rnd.nextInt(names.surnames.size()));
        List<String> given = "male".equals(gender) ? names.male : names.female;
        String g = given.get(rnd.nextInt(given.size()));
        if (rnd.nextDouble() < 0.25) {
            String g2 = given.get(rnd.nextInt(given.size()));
            g = g + g2;
        }
        return surname + g;
    }

    private void drawLottery() {
        // 开奖逻辑在 GambleActions 中实现，这里只触发
        GambleActions.draw(this);
    }
}
