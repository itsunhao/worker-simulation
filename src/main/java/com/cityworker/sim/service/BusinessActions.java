package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 创业开店系统：从打工人到小老板 */
public final class BusinessActions {

    private BusinessActions() {}

    public static void business(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (s.bizId == null) {
            out.add(Ansi.banner("创业孵化中心", "STARTUP"));
            out.add(Ansi.gray("　攒够了启动资金，就开一家自己的店吧。经营得当，收入远超打工。"));
            List<GameConfig.BusinessDef> list = gs.cfg().businesses;
            for (int i = 0; i < list.size(); i++) {
                GameConfig.BusinessDef b = list.get(i);
                out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(b.icon + " " + b.name)
                        + Ansi.gray("　启动金" + b.cost + "元｜声望≥" + b.minPrestige + "｜日收益约" + b.baseIncome + "元｜体力-" + b.stamina));
                out.add(Ansi.darkGray("　　" + b.desc));
            }
            out.add("");
            out.add(Ansi.yellow("输入 open <编号> 开店（如 open 1）"));
            return;
        }
        // 我的店铺
        GameConfig.BusinessDef b = find(gs, s.bizId);
        if (b == null) { s.bizId = null; business(gs, out, args); return; }
        long income = dailyIncome(gs, b);
        out.add(Ansi.banner(b.icon + " " + b.name, "MY BUSINESS"));
        out.add(Ansi.cyan("　等级 Lv." + s.bizLevel + "　累计营收 " + s.bizRevenue + " 元　声望 +" + (s.bizLevel * 5)));
        out.add(Ansi.gray("　" + b.desc));
        out.add(Ansi.gray("　今日预估营收 " + income + " 元（基础 " + (b.baseIncome * levelMult(s.bizLevel)) + " × 经营加成）"));
        boolean today = s.bizLastRunDay == s.day();
        if (today) out.add(Ansi.yellow("　今天已经经营过了，明天再来。"));
        else out.add(Ansi.yellow("　输入 run 今日经营（消耗体力" + b.stamina + "，时间2小时）"));
        out.add(Ansi.yellow("　输入 upgrade 升级（花费" + upgradeCost(b, s) + "元）｜输入 close 转让店铺"));
    }

    public static void open(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) { out.add(Ansi.yellow("用法：open <编号>，先 business 查看店铺。")); return; }
        GameConfig.BusinessDef b = resolve(gs, args[0]);
        if (b == null) { out.add(Ansi.red("没有这个店铺，输入 business 查看。")); return; }
        if (s.bizId != null) { out.add(Ansi.yellow("你已经有一家「" + name(gs, s.bizId) + "」了，先 close 转让再开新店。")); return; }
        if (s.character.prestige < b.minPrestige) {
            out.add(Ansi.red("开「" + b.name + "」需要声望 ≥ " + b.minPrestige + "（当前 " + s.character.prestige + "），先攒攒声望。")); return;
        }
        if (s.character.money < b.cost) {
            out.add(Ansi.red("启动资金不够（需 " + b.cost + " 元，差 " + (b.cost - s.character.money) + " 元）。")); return;
        }
        s.character.money -= b.cost;
        s.bizId = b.id;
        s.bizLevel = 1;
        s.bizRevenue = 0;
        s.bizOpenedDay = s.day();
        s.bizLastRunDay = -1;
        gs.changePrestige(5);
        gs.changeMood(8);
        out.add(Ansi.green("🎉 「" + b.name + "」开业大吉！交了 " + b.cost + " 元，声望 +5。"));
        out.add(Ansi.gray("　经营一段时间攒钱升级，收入会越来越可观。输入 business 查看经营面板。"));
    }

    public static void run(GameService gs, List<String> out) {
        GameState s = gs.state();
        GameConfig.BusinessDef b = s.bizId == null ? null : find(gs, s.bizId);
        if (b == null) { out.add(Ansi.yellow("你还没有店铺，输入 business 看看开店项目。")); return; }
        if (s.bizLastRunDay == s.day()) { out.add(Ansi.yellow("今天已经经营过了，养精蓄锐，明天再来。")); return; }
        if (s.character.stamina < b.stamina) { out.add(Ansi.red("体力不够（需 " + b.stamina + "，当前 " + s.character.stamina + "），先睡一觉。")); return; }
        long income = dailyIncome(gs, b);
        s.bizLastRunDay = s.day();
        s.bizRevenue += income;
        s.character.money += income;
        gs.changeStamina(-b.stamina);
        gs.changeHunger(-3);
        gs.advanceTime(120);
        out.add(Ansi.cyan("🏪 你忙活了2小时「" + b.name + "」……"));
        out.add(Ansi.green("　💰 今日营收 " + income + " 元（累计 " + s.bizRevenue + " 元）"));
        if (gs.rnd().nextInt(100) < 8 + Math.min(30, s.character.charm / 2)) {
            s.character.prestige += 2;
            out.add(Ansi.gray("　有个熟客帮你宣传了一波，声望 +2。"));
        }
        if (s.character.mood < 40) {
            gs.changeMood(3);
            out.add(Ansi.gray("　数着今天的进账，心里踏实了一点，心情 +3。"));
        }
    }

    public static void upgrade(GameService gs, List<String> out) {
        GameState s = gs.state();
        GameConfig.BusinessDef b = s.bizId == null ? null : find(gs, s.bizId);
        if (b == null) { out.add(Ansi.yellow("你还没有店铺，先 business 开一家。")); return; }
        if (s.bizLevel >= 5) { out.add(Ansi.gold("已经是旗舰店了，没有更高等级。")); return; }
        int cost = upgradeCost(b, s);
        if (s.character.money < cost) { out.add(Ansi.red("升级需要 " + cost + " 元，差 " + (cost - s.character.money) + " 元。")); return; }
        s.character.money -= cost;
        s.bizLevel++;
        gs.changePrestige(3);
        gs.changeMood(4);
        out.add(Ansi.green("🛠 「" + b.name + "」升级到 Lv." + s.bizLevel + "！花费 " + cost + " 元。"));
        out.add(Ansi.gray("　店面更气派了，日营收提升，声望 +3。"));
    }

    public static void close(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.bizId == null) { out.add(Ansi.yellow("你还没有店铺，谈不上转让。")); return; }
        GameConfig.BusinessDef b = find(gs, s.bizId);
        String name = b == null ? "店铺" : b.name;
        long refund = b == null ? 0 : (long) (s.bizRevenue * 0.1);
        s.character.money += refund;
        s.bizId = null;
        s.bizLevel = 1;
        s.bizRevenue = 0;
        gs.changeMood(-4);
        out.add(Ansi.cyan("🏷 你把「" + name + "」转让了出去，按营收结余拿回 " + refund + " 元。"));
        out.add(Ansi.gray("　江湖路远，想东山再起随时 business 看项目。"));
    }

    // ============ 内部工具 ============

    private static long dailyIncome(GameService gs, GameConfig.BusinessDef b) {
        GameState s = gs.state();
        double mult = levelMult(s.bizLevel);
        double bonus = 1 + s.character.charm * 0.004 + s.character.prestige * 0.006;
        double luck = 0.85 + gs.rnd().nextDouble() * 0.35;
        return Math.round(b.baseIncome * mult * bonus * luck);
    }

    private static double levelMult(int level) {
        return Math.pow(1.5, level - 1);
    }

    private static int upgradeCost(GameConfig.BusinessDef b, GameState s) {
        return (int) (b.cost * 0.6 * s.bizLevel);
    }

    private static GameConfig.BusinessDef find(GameService gs, String id) {
        return gs.cfg().businesses.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
    }

    private static String name(GameService gs, String id) {
        GameConfig.BusinessDef b = find(gs, id);
        return b == null ? "店铺" : b.name;
    }

    private static GameConfig.BusinessDef resolve(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().businesses.size()) return gs.cfg().businesses.get(idx - 1);
        return gs.cfg().businesses.stream().filter(x -> x.id.equals(arg)).findFirst().orElse(null);
    }
}
