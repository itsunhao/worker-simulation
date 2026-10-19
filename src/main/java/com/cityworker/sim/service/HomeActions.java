package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 家居系统：家电购买 / 家具效果 / 电脑桌面应用（线上求职·股票·银行·刷剧·网游·直播·接单） */
public final class HomeActions {

    private HomeActions() {}

    // ==================== 家居指令 ====================

    public static void home(GameService gs, List<String> out, String[] args) {
        if (args.length >= 1 && "buy".equalsIgnoreCase(args[0])) { buy(gs, out, args); return; }
        if (args.length >= 1 && "watch".equalsIgnoreCase(args[0])) { watch(gs, out); return; }
        if (args.length >= 1 && "music".equalsIgnoreCase(args[0])) { music(gs, out); return; }
        list(gs, out);
    }

    /** home：家中陈设一览 */
    public static void list(GameService gs, List<String> out) {
        GameState s = gs.state();
        out.add(Ansi.banner("温馨小家", "MY SWEET HOME"));
        if (s.ownedEstates.isEmpty()) {
            out.add(Ansi.gray("　你还没有属于自己的房子，先去房产中介看看（move 房产中介）。"));
            return;
        }
        if (s.homeItems.isEmpty()) {
            out.add(Ansi.gray("　家里空荡荡的，连个落脚的地方都显得冷清。"));
            out.add(Ansi.gray("　去商场（move 商场）或输入 home buy 看看有什么家具家电可以添置。"));
            return;
        }
        out.add(Ansi.gray("　—— 家中陈设 ——"));
        for (String hid : s.homeItems) {
            GameConfig.HomeItemDef d = find(gs, hid);
            if (d == null) continue;
            String tag = "computer".equals(d.category) ? "🖥️" : "tv".equals(d.category) ? "📺"
                    : "appliance".equals(d.category) ? "🔌" : "🛋️";
            out.add(Ansi.cyan("  " + tag + " " + d.name) + Ansi.gray("（" + d.brand + "）"));
            out.add(Ansi.darkGray("　　" + d.desc));
            if (d.unlock != null && !d.unlock.isEmpty()) {
                out.add(Ansi.darkGray("　　🔓 解锁：" + String.join(" / ", d.unlock)));
            }
        }
        GameConfig.HomeItemDef pc = bestPc(gs);
        if (pc != null) {
            out.add("");
            out.add(Ansi.yellow("　🖥️ 打开电脑（pc）——" + pc.name + " · " + pc.desc));
        }
        out.add(Ansi.gray("　📺 看电视 home watch ｜ 🎵 听音乐 home music"));
    }

    /** home buy <id>：购买家具家电 */
    public static void buy(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"home".equals(s.locationId) || s.ownedEstates.isEmpty()) {
            out.add(Ansi.red("得先拥有自己的房子，并且人在家中才能布置（move 住处）。"));
            return;
        }
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：home buy <编号>，先输入 home 查看可购清单。"));
            return;
        }
        int idx;
        try { idx = Integer.parseInt(args[1]); } catch (NumberFormatException e) {
            out.add(Ansi.red("编号要是数字。"));
            return;
        }
        List<GameConfig.HomeItemDef> avail = gs.cfg().homeItems;
        if (idx < 1 || idx > avail.size()) { out.add(Ansi.red("没有这个编号。")); return; }
        GameConfig.HomeItemDef d = avail.get(idx - 1);
        if (s.homeItems.contains(d.id)) { out.add(Ansi.yellow("这个已经买过了。")); return; }
        if (s.character.money < d.cost) {
            out.add(Ansi.red("钱不够：需要 " + d.cost + " 元，你只有 " + s.character.money + " 元。"));
            return;
        }
        s.character.money -= d.cost;
        s.homeItems.add(d.id);
        gs.changePrestige(d.prestige);
        gs.changeMood(d.mood);
        out.add(Ansi.green("🛒 已购入「" + d.name + "」（" + d.brand + "）"));
        out.add(Ansi.gray("　" + d.desc + (d.mood > 0 ? "，心情 +" + d.mood : "") + (d.prestige > 0 ? "，声望 +" + d.prestige : "")));
        if ("computer".equals(d.category)) {
            out.add(Ansi.yellow("　💻 现在可以在家输入 pc 打开电脑了！"));
        }
        gs.pushState();
    }

    /** home watch：看电视 */
    public static void watch(GameService gs, List<String> out) {
        GameState s = gs.state();
        GameConfig.HomeItemDef tv = bestTv(gs);
        if (tv == null) { out.add(Ansi.red("家里没有电视，先去商场买一台（home buy）。")); return; }
        int mood = tv.level >= 3 ? 5 : tv.level >= 2 ? 3 : 2;
        // 每日 2 次上限
        if (s.lastVideoDay == s.day() && s.videoCount >= 2) {
            out.add(Ansi.yellow("今天电视看得够多了，保护眼睛，明天再看。"));
            return;
        }
        if (s.lastVideoDay != s.day()) { s.lastVideoDay = s.day(); s.videoCount = 0; }
        s.videoCount++;
        gs.advanceTime(60);
        gs.changeMood(mood);
        out.add(Ansi.cyan("📺 你窝在沙发上看了会儿「" + (tv.level >= 3 ? "4K 家庭影院大片" : tv.level >= 2 ? "热门综艺" : "新闻联播") + "」……"));
        out.add(Ansi.green("　心情 +" + mood + "（" + tv.name + "）"));
        gs.pushState();
    }

    /** home music：听音乐 */
    public static void music(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!s.homeItems.contains("speaker")) { out.add(Ansi.red("家里没有音箱，去商场买一台漫步者吧（home buy）。")); return; }
        gs.advanceTime(30);
        gs.changeMood(2);
        out.add(Ansi.cyan("🎵 音箱里响起熟悉的旋律，一天的疲惫随节奏慢慢化开……"));
        out.add(Ansi.green("　心情 +2"));
        gs.pushState();
    }

    // ==================== 电脑指令 ====================

    public static void pc(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"home".equals(s.locationId)) {
            out.add(Ansi.red("电脑在家里，得先回家（move 住处）。"));
            return;
        }
        GameConfig.HomeItemDef pc = bestPc(gs);
        if (pc == null) {
            out.add(Ansi.red("家里没有电脑。去商场（home buy）买一台：低配可线上求职/炒股/网银，高配还能直播带货！"));
            return;
        }
        if (args.length == 0) { pcMenu(gs, out, pc); return; }
        String app = args[0].toLowerCase();
        switch (app) {
            case "job" -> pcJob(gs, out, pc, args);
            case "stock" -> pcStock(gs, out, args);
            case "bank" -> pcBank(gs, out, args);
            case "video" -> pcVideo(gs, out, pc);
            case "game" -> pcGame(gs, out, pc);
            case "chat" -> pcChat(gs, out, pc);
            case "live" -> pcLive(gs, out, pc);
            case "code" -> pcCode(gs, out, pc);
            case "ai" -> pcAi(gs, out, pc);
            default -> pcMenu(gs, out, pc);
        }
    }

    private static void pcMenu(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        out.add(Ansi.banner("电脑桌面", pc.brand + " · " + pc.name));
        out.add(Ansi.gray("　" + pc.desc));
        out.add(Ansi.gray("　解锁应用：" + String.join(" / ", pc.unlock)));
        out.add("");
        out.add(Ansi.cyan("  pc job    —— 线上求职（投简历、远程入职）"));
        if (pc.level >= 1) out.add(Ansi.cyan("  pc stock  —— 股票行情与交易"));
        if (pc.level >= 1) out.add(Ansi.cyan("  pc bank   —— 网上银行（余额/存取）"));
        if (pc.level >= 2) out.add(Ansi.cyan("  pc video  —— 刷剧追番（心情+4，每日2次）"));
        if (pc.level >= 2) out.add(Ansi.cyan("  pc game   —— 网络游戏（心情+6，可能赢小钱）"));
        if (pc.level >= 2) out.add(Ansi.cyan("  pc chat   —— 视频通话（与伴侣亲密+3）"));
        if (pc.level >= 3) out.add(Ansi.gold("  pc live   —— 带货直播（按魅力声望赚钱，每日1次）"));
        if (pc.level >= 3) out.add(Ansi.gold("  pc code   —— 接单写代码（按智力赚钱，每日2次）"));
        if (pc.level >= 3) out.add(Ansi.gold("  pc ai     —— AI 绘画（看运气卖图）"));
        out.add(Ansi.gray("　低配电脑也能完成求职/股票/银行；更高配置解锁更多玩法。"));
    }

    private static void pcJob(GameService gs, List<String> out, GameConfig.HomeItemDef pc, String[] args) {
        GameState s = gs.state();
        if (args.length >= 2 && args[1].matches("\\d+")) {
            int idx = Integer.parseInt(args[1]);
            List<GameConfig.JobDef> jobs = gs.cfg().jobs;
            if (idx < 1 || idx > jobs.size()) { out.add(Ansi.red("没有这个岗位编号。")); return; }
            GameConfig.JobDef job = jobs.get(idx - 1);
            if (s.jobId != null && s.jobId.equals(job.id)) { out.add(Ansi.yellow("你已经在做这份工作了。")); return; }
            if (s.jobId != null) { out.add(Ansi.red("你现在有工作（" + gs.jobName(gs.cfg(), s.jobId) + "），先 resign 辞职再换。")); return; }
            String fail = JobActions.checkJobReqs(gs, job);
            if (fail != null) {
                out.add(Ansi.red("✘ 不符合入职要求：" + fail));
                out.add(Ansi.gray("提示：缺属性练不上去就换条路；缺服装去商场 shop 买；缺证书去培训中心 train 考。"));
                return;
            }
            s.jobId = job.id;
            s.jobCount++;
            out.add(Ansi.green("🎉 线上面试通过！你成为了一名" + Ansi.bold(job.name) + "。"));
            out.add(Ansi.gray("　明天开始上班（去 工作地点 输入 work 打工）。"));
            gs.checkAchievements(out);
            gs.pushState();
            return;
        }
        out.add(Ansi.banner("线上招聘大厅", "ONLINE JOBS"));
        int i = 1;
        for (GameConfig.JobDef j : gs.cfg().jobs) {
            StringBuilder req = new StringBuilder();
            if (j.minStr > 0) req.append("体力≥").append(j.minStr).append(" ");
            if (j.minIntel > 0) req.append("智力≥").append(j.minIntel).append(" ");
            if (j.minCharm > 0) req.append("魅力≥").append(j.minCharm).append(" ");
            if (j.minPrestige > 0) req.append("声望≥").append(j.minPrestige).append(" ");
            if (j.requiredCertificate != null) req.append("证书:").append(JobActions.certName(gs, j.requiredCertificate)).append(" ");
            if (j.requiredCerts != null && !j.requiredCerts.isEmpty()) {
                req.append("证书:");
                for (int k = 0; k < j.requiredCerts.size(); k++) {
                    if (k > 0) req.append("+");
                    req.append(JobActions.certName(gs, j.requiredCerts.get(k)));
                }
            }
            if (j.requiredOutfit != null) req.append("着装:").append(j.requiredOutfit);
            String tag = "special".equals(j.type) ? Ansi.gold("[高薪]") : Ansi.gray("[一般]");
            out.add(Ansi.cyan(i + ". ") + tag + Ansi.bold(j.name) + Ansi.gray(" 日薪 " + j.daily + "元  ") + (req.length() > 0 ? Ansi.darkGray(req.toString()) : ""));
            i++;
        }
        out.add("");
        out.add(Ansi.yellow("输入 pc job <编号> 在线投递（条件与人才市场一致）"));
    }

    private static void pcStock(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length >= 2 && "buy".equalsIgnoreCase(args[1])) {
            if (args.length < 4) { out.add(Ansi.yellow("用法：pc stock buy <代码> <股数>（1手=100股）")); return; }
            StockActions.buyOnline(gs, out, args[2], args[3]);
            return;
        }
        if (args.length >= 2 && "sell".equalsIgnoreCase(args[1])) {
            if (args.length < 4) { out.add(Ansi.yellow("用法：pc stock sell <代码> <股数>")); return; }
            StockActions.sellOnline(gs, out, args[2], args[3]);
            return;
        }
        if (args.length >= 2 && "mine".equalsIgnoreCase(args[1])) { StockActions.mine(gs, out); return; }
        out.add(Ansi.banner("网上证券 · 行情", "PC STOCK"));
        for (GameState.StockQuote q : s.market) {
            double chg = q.dayChangePct();
            String colored = chg >= 0 ? Ansi.red("+" + String.format("%.2f", chg) + "%") : Ansi.green(String.format("%.2f", chg) + "%");
            out.add(Ansi.cyan(" " + q.code) + "  " + Ansi.bold(q.name) + Ansi.gray(" " + q.sector + " ")
                    + Ansi.gold(String.format("%8.2f", q.price)) + "  " + colored);
        }
        out.add(Ansi.gray("　说明：1手=100股，资金有风险。pc stock buy <代码> <股数> / sell / mine"));
    }

    private static void pcBank(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length >= 2 && "deposit".equalsIgnoreCase(args[1])) {
            int amt = args.length >= 3 ? parseAmt(args[2]) : -1;
            if (amt <= 0) { out.add(Ansi.yellow("用法：pc bank deposit <金额>")); return; }
            if (s.character.money < amt) { out.add(Ansi.red("现金不够。")); return; }
            s.character.money -= amt;
            s.character.deposit += amt;
            out.add(Ansi.green("🏦 已存入 " + amt + " 元，存款 " + s.character.deposit + " 元。"));
            gs.pushState();
            return;
        }
        if (args.length >= 2 && "withdraw".equalsIgnoreCase(args[1])) {
            int amt = args.length >= 3 ? parseAmt(args[2]) : -1;
            if (amt <= 0) { out.add(Ansi.yellow("用法：pc bank withdraw <金额>")); return; }
            if (s.character.deposit < amt) { out.add(Ansi.red("存款不够。")); return; }
            s.character.deposit -= amt;
            s.character.money += amt;
            out.add(Ansi.green("🏦 已取出 " + amt + " 元，存款剩 " + s.character.deposit + " 元。"));
            gs.pushState();
            return;
        }
        out.add(Ansi.banner("网上银行", "E-BANK"));
        out.add(Ansi.gray("　现金 " + s.character.money + " 元 ｜ 存款 " + s.character.deposit + " 元（日息 0.05%）"));
        out.add(Ansi.yellow("　pc bank deposit <金额> 存款 ｜ pc bank withdraw <金额> 取款"));
    }

    private static void pcVideo(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.lastVideoDay == s.day() && s.videoCount >= 2) { out.add(Ansi.yellow("今天刷剧够多了，明天再看。")); return; }
        if (s.lastVideoDay != s.day()) { s.lastVideoDay = s.day(); s.videoCount = 0; }
        s.videoCount++;
        gs.advanceTime(60);
        gs.changeMood(4);
        out.add(Ansi.cyan("🎬 你追了一集热播剧，弹幕里笑成一片……"));
        out.add(Ansi.green("　心情 +4"));
        gs.pushState();
    }

    private static void pcGame(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.lastGameDay == s.day() && s.gameCount >= 2) { out.add(Ansi.yellow("今天游戏打够了，明天再战。")); return; }
        if (s.lastGameDay != s.day()) { s.lastGameDay = s.day(); s.gameCount = 0; }
        s.gameCount++;
        gs.advanceTime(60);
        gs.changeMood(6);
        out.add(Ansi.cyan("🎮 你在" + (pc.level >= 3 ? "3A 大作" : "竞技网游") + "里大杀四方……"));
        out.add(Ansi.green("　心情 +6"));
        if (gs.rnd().nextInt(100) < 25) {
            int win = 50 + gs.rnd().nextInt(200);
            gs.addMoney(win);
            out.add(Ansi.gold("　🎁 竟然打出了稀有道具，被土豪 1000 元收走——到手 " + win + " 元！"));
        }
        gs.pushState();
    }

    private static void pcChat(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.partnerId == null) { out.add(Ansi.gray("你还没有伴侣，视频通话只能打给客服……（先去社交认识一下吧）")); return; }
        if (s.lastChatDay == s.day()) { out.add(Ansi.yellow("今天已经视频过了，明天再聊。")); return; }
        s.lastChatDay = s.day();
        var partner = s.npcs.stream().filter(n -> n.id.equals(s.partnerId)).findFirst().orElse(null);
        if (partner == null) { out.add(Ansi.gray("奇怪，你的伴侣联系不上了……")); return; }
        gs.advanceTime(30);
        partner.affection = Math.min(100, partner.affection + 3);
        gs.changeMood(3);
        out.add(Ansi.cyan("📹 视频接通，" + partner.name + "的脸出现在屏幕上，笑着和你打招呼……"));
        out.add(Ansi.green("　" + partner.name + " 好感 +3，你的心情 +3"));
        gs.pushState();
    }

    private static void pcLive(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.lastLiveDay == s.day()) { out.add(Ansi.yellow("今天直播过了，休息一下，明天再开播。")); return; }
        if (s.character.stamina < 10) { out.add(Ansi.red("体力不够直播两小时，先休息吧。")); return; }
        s.lastLiveDay = s.day();
        gs.advanceTime(120);
        gs.changeStamina(-10);
        int charm = gs.gearCharm();
        int prestige = gs.gearPrestige();
        int earn = 150 + charm * 15 + prestige * 8;
        int viewers = 200 + charm * 40 + prestige * 20;
        gs.addMoney(earn);
        out.add(Ansi.banner("带货直播", pc.brand + " 高清摄像头"));
        out.add(Ansi.cyan("　你开播 2 小时，凭借" + charm + "点魅力吸引 " + viewers + " 人在线围观……"));
        out.add(Ansi.green("　💰 带货佣金 +" + earn + " 元（体力 -10）"));
        gs.changePrestige(1);
        gs.pushState();
    }

    private static void pcCode(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.lastCodeDay == s.day() && s.codeCount >= 2) { out.add(Ansi.yellow("今天接单量已满，明天再来。")); return; }
        if (s.lastCodeDay != s.day()) { s.lastCodeDay = s.day(); s.codeCount = 0; }
        if (s.character.stamina < 8) { out.add(Ansi.red("体力不够，写不动代码了。")); return; }
        s.codeCount++;
        gs.advanceTime(120);
        gs.changeStamina(-8);
        int intel = s.character.intel;
        int earn = 100 + intel * 12;
        gs.addMoney(earn);
        boolean bonus = gs.rnd().nextInt(100) < 15 + intel / 10;
        out.add(Ansi.banner("接单写代码", "UPWORK 外包平台"));
        out.add(Ansi.cyan("　你接了个" + (bonus ? "紧急" : "普通") + "外包单，敲了 2 小时键盘……"));
        if (bonus) {
            int extra = earn / 2;
            gs.addMoney(extra);
            out.add(Ansi.gold("　🏅 甲方很满意，追加了奖金！"));
            out.add(Ansi.green("　💰 收入 " + (earn + extra) + " 元（含奖金 " + extra + "，体力 -8）"));
        } else {
            out.add(Ansi.green("　💰 收入 " + earn + " 元（体力 -8）"));
        }
        gs.pushState();
    }

    private static void pcAi(GameService gs, List<String> out, GameConfig.HomeItemDef pc) {
        GameState s = gs.state();
        if (s.lastAiDay == s.day()) { out.add(Ansi.yellow("今天画过了，明天再创作。")); return; }
        s.lastAiDay = s.day();
        gs.advanceTime(60);
        gs.changeMood(5);
        out.add(Ansi.cyan("🎨 你指挥 AI 画了一幅「赛博打工人的黄昏」主题的作品……"));
        if (gs.rnd().nextInt(100) < 20 + s.character.luck / 2) {
            int earn = 200 + gs.rnd().nextInt(1800);
            gs.addMoney(earn);
            out.add(Ansi.gold("　🖼️ 有画廊看中了这幅画，出价 " + earn + " 元！"));
        } else {
            out.add(Ansi.gray("　作品发到网上，收获了几百个赞（心情 +5），暂时没卖出去。"));
        }
        gs.pushState();
    }

    // ==================== 工具 ====================

    static GameConfig.HomeItemDef find(GameService gs, String id) {
        for (GameConfig.HomeItemDef d : gs.cfg().homeItems) {
            if (d.id.equals(id)) return d;
        }
        return null;
    }

    /** 玩家拥有的最高配电脑 */
    public static GameConfig.HomeItemDef bestPc(GameService gs) {
        GameConfig.HomeItemDef best = null;
        for (String hid : gs.state().homeItems) {
            GameConfig.HomeItemDef d = find(gs, hid);
            if (d != null && "computer".equals(d.category) && (best == null || d.level > best.level)) best = d;
        }
        return best;
    }

    public static GameConfig.HomeItemDef bestTv(GameService gs) {
        GameConfig.HomeItemDef best = null;
        for (String hid : gs.state().homeItems) {
            GameConfig.HomeItemDef d = find(gs, hid);
            if (d != null && "tv".equals(d.category) && (best == null || d.level > best.level)) best = d;
        }
        return best;
    }

    /** 家庭家居带来的心情加成（用于睡觉等场景，半效） */
    public static int homeMoodBonus(GameService gs) {
        int bonus = 0;
        for (String hid : gs.state().homeItems) {
            GameConfig.HomeItemDef d = find(gs, hid);
            if (d != null && d.mood > 0) bonus += (d.mood + 1) / 2;
        }
        return Math.min(6, bonus);
    }

    private static int parseAmt(String v) {
        try { return Integer.parseInt(v); } catch (NumberFormatException e) { return -1; }
    }

    // ==================== 家庭互动（伴侣） ====================

    public static void family(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"home".equals(s.locationId)) {
            out.add(Ansi.red("得在家里才能和TA腻歪（move 住处）。"));
            return;
        }
        if (s.partnerId == null) {
            out.add(Ansi.gray("你还没有对象，先去大街或工作地点社交认识一个吧。"));
            return;
        }
        var p = s.npcs.stream().filter(n -> n.id.equals(s.partnerId)).findFirst().orElse(null);
        if (p == null) { out.add(Ansi.gray("TA联系不上了……")); return; }
        if (args.length == 0) { familyMenu(gs, out, p); return; }
        String act = args[0].toLowerCase();
        String rel = p.relation == null ? "FRIEND" : p.relation;
        boolean spouse = "SPOUSE".equals(rel);
        boolean lover = "LOVER".equals(rel) || "FIANCEE".equals(rel);
        boolean crush = "CRUSH".equals(rel);
        switch (act) {
            case "chat" -> {
                gs.advanceTime(30);
                p.affection = Math.min(100, p.affection + 2);
                gs.changeMood(2);
                out.add(Ansi.cyan("💬 你和" + p.name + "窝在沙发上聊了很久，从童年聊到梦想……"));
                out.add(Ansi.green("　" + p.name + " 好感 +2，你的心情 +2"));
            }
            case "flower" -> {
                if (s.character.money < 20) { out.add(Ansi.red("连 20 元的鲜花都买不起……")); return; }
                s.character.money -= 20;
                gs.advanceTime(30);
                p.affection = Math.min(100, p.affection + 4);
                gs.changeMood(2);
                out.add(Ansi.magenta("💐 你买了一束花送给" + p.name + "，TA 眼睛亮晶晶的……"));
                out.add(Ansi.green("　" + p.name + " 好感 +4，你的心情 +2（-20 元）"));
            }
            case "hug" -> {
                if (!crush && !lover && !spouse) { out.add(Ansi.yellow("你们的关系还没到拥抱的程度（先多聊聊天吧）。")); return; }
                gs.advanceTime(30);
                p.affection = Math.min(100, p.affection + 3);
                gs.changeMood(3);
                out.add(Ansi.pink("🤗 你轻轻抱住" + p.name + "，TA 也回抱住你，像抱住了一整个冬天……"));
                out.add(Ansi.green("　" + p.name + " 好感 +3，你的心情 +3"));
            }
            case "movie" -> {
                if (!crush && !lover && !spouse) { out.add(Ansi.yellow("关系还不够，先约出来看看电影吧（需要更亲密些）。")); return; }
                if (s.character.money < 60) { out.add(Ansi.red("电影票 60 元，钱包告急。")); return; }
                s.character.money -= 60;
                gs.advanceTime(120);
                p.affection = Math.min(100, p.affection + 5);
                gs.changeMood(4);
                out.add(Ansi.cyan("🎬 你俩挤在家里投影前看了一场老电影，看到一半TA靠在你肩上睡着了……"));
                out.add(Ansi.green("　" + p.name + " 好感 +5，你的心情 +4（-60 元）"));
            }
            case "cook" -> {
                if (!lover && !spouse) { out.add(Ansi.yellow("你们的关系还没到能一起开火做饭的程度。")); return; }
                gs.advanceTime(60);
                p.affection = Math.min(100, p.affection + 4);
                gs.changeMood(3);
                gs.changeHunger(10);
                out.add(Ansi.cyan("🍳 你俩一起下厨，TA 掌勺你打下手，厨房里烟火气十足……"));
                out.add(Ansi.green("　" + p.name + " 好感 +4，心情 +3，饱腹 +10"));
            }
            case "date" -> {
                if (!lover && !spouse) { out.add(Ansi.yellow("只有恋人/未婚/已婚才能约会（先表白吧）。")); return; }
                if (s.character.money < 80) { out.add(Ansi.red("约会基金 80 元，先攒攒钱。")); return; }
                s.character.money -= 80;
                gs.advanceTime(180);
                p.affection = Math.min(100, p.affection + 6);
                gs.changeMood(5);
                out.add(Ansi.pink("💞 你们手牵手逛了夜市、看了喷泉，TA 说这是最近最开心的一天……"));
                out.add(Ansi.green("　" + p.name + " 好感 +6，你的心情 +5（-80 元）"));
            }
            case "wedding" -> {
                if (!"FIANCEE".equals(rel)) { out.add(Ansi.yellow("你们还没订婚呢（好感度 85+ 且表白后）……")); return; }
                gs.advanceTime(120);
                p.affection = Math.min(100, p.affection + 8);
                gs.changeMood(6);
                out.add(Ansi.gold("💍 你们认真商量起了婚礼的细节：彩礼、酒席、还有未来的小家……"));
                out.add(Ansi.green("　" + p.name + " 好感 +8，你的心情 +6"));
            }
            case "dinner" -> {
                if (!spouse) { out.add(Ansi.yellow("只有结了婚才天天一起吃晚饭（先求婚吧）。")); return; }
                if (s.character.money < 30) { out.add(Ansi.red("今晚只能喝西北风了……")); return; }
                s.character.money -= 30;
                gs.advanceTime(60);
                p.affection = Math.min(100, p.affection + 4);
                gs.changeMood(4);
                gs.changeHunger(15);
                out.add(Ansi.gold("🍚 家常便饭，两菜一汤，TA 给你夹了你爱吃的红烧肉……"));
                out.add(Ansi.green("　" + p.name + " 好感 +4，心情 +4，饱腹 +15（-30 元）"));
            }
            case "chore" -> {
                if (!spouse) { out.add(Ansi.yellow("还没结婚，家务各干各的吧。")); return; }
                gs.advanceTime(60);
                p.affection = Math.min(100, p.affection + 3);
                gs.changeMood(2);
                out.add(Ansi.cyan("🧹 你拖地TA擦窗，一个家就这样慢慢有了生活的样子……"));
                out.add(Ansi.green("　" + p.name + " 好感 +3，你的心情 +2"));
            }
            case "cuddle" -> {
                if (!spouse) { out.add(Ansi.yellow("这份亲昵是已婚专属。")); return; }
                gs.advanceTime(30);
                p.affection = Math.min(100, p.affection + 5);
                gs.changeMood(6);
                out.add(Ansi.pink("🛋️ 你靠在TA怀里看电视，TA 揉了揉你的头发，温柔得不像话……"));
                out.add(Ansi.green("　" + p.name + " 好感 +5，你的心情 +6"));
            }
            case "plan" -> {
                if (!spouse) { out.add(Ansi.yellow("未来的规划，等结婚后再说吧。")); return; }
                gs.advanceTime(60);
                p.affection = Math.min(100, p.affection + 4);
                gs.changeMood(3);
                out.add(Ansi.cyan("🗺️ 你们摊开地图，认真讨论着换大房子、回老家养老、还要不要养只猫……"));
                out.add(Ansi.green("　" + p.name + " 好感 +4，你的心情 +3"));
            }
            default -> familyMenu(gs, out, p);
        }
        gs.pushState();
    }

    private static void familyMenu(GameService gs, List<String> out, com.cityworker.sim.model.NPC p) {
        String rel = p.relation == null ? "FRIEND" : p.relation;
        boolean spouse = "SPOUSE".equals(rel);
        boolean lover = "LOVER".equals(rel) || "FIANCEE".equals(rel);
        boolean crush = "CRUSH".equals(rel);
        out.add(Ansi.banner("温馨小家", p.genderEmoji() + " " + p.name + " · " + rel));
        out.add(Ansi.gray("　好感度 " + p.affection + "/100 · " + (spouse ? "已结婚" : lover ? (rel.equals("FIANCEE") ? "已订婚" : "恋爱中") : crush ? "暧昧期" : "普通朋友")));
        out.add("");
        out.add(Ansi.cyan("  family chat   —— 聊天（好感+2）"));
        out.add(Ansi.cyan("  family flower —— 送花（20元，好感+4）"));
        if (crush || lover || spouse) out.add(Ansi.pink("  family hug     —— 拥抱（好感+3）"));
        if (crush || lover || spouse) out.add(Ansi.pink("  family movie   —— 看家庭电影（60元，好感+5）"));
        if (lover || spouse) out.add(Ansi.pink("  family cook    —— 一起做饭（好感+4）"));
        if (lover || spouse) out.add(Ansi.pink("  family date    —— 约会（80元，好感+6）"));
        if (rel.equals("FIANCEE")) out.add(Ansi.gold("  family wedding —— 商量婚礼（好感+8）"));
        if (spouse) out.add(Ansi.gold("  family dinner  —— 一起晚餐（30元，好感+4）"));
        if (spouse) out.add(Ansi.gold("  family chore   —— 一起做家务（好感+3）"));
        if (spouse) out.add(Ansi.gold("  family cuddle  —— 依偎亲昵（好感+5）"));
        if (spouse) out.add(Ansi.gold("  family plan    —— 规划未来（好感+4）"));
    }
}
