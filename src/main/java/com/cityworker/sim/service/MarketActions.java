package com.cityworker.sim.service;

import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/**
 * 夜市 / 鬼市玩法（深夜限定地点）
 * 夜市：ringtoss 套圈小游戏；鬼市：antique 淘古董（赌运气）、fortune 求签
 */
public class MarketActions {

    /* ================ 夜市：套圈 ================ */
    public static void ringtoss(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"nightmarket".equals(s.locationId)) {
            out.add(Ansi.red("套圈得去夜市（move 夜市，晚上 19 点后开市）"));
            return;
        }
        if (s.character.money < 20) {
            out.add(Ansi.red("套圈一次 20 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 20;
        gs.advanceTime(15);
        double charmBonus = gs.gearCharm() / 200.0;   // 魅力加成命中率
        int hit = 0, cash = 0;
        for (int i = 0; i < 3; i++) {
            if (gs.rnd().nextDouble() < 0.38 + charmBonus) {
                hit++;
                cash += 5 + gs.rnd().nextInt(26);
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append(Ansi.gold("🎯 你花了 20 元套了 3 圈："));
        for (int i = 0; i < 3; i++) sb.append(i < hit ? "🟢" : "⚫");
        out.add(sb.toString());
        if (hit == 0) {
            out.add(Ansi.gray("　一个都没中，老板娘看你可怜送了根烤肠（心情 +3）"));
            gs.changeMood(3);
            gs.advanceTime(5);
        } else {
            out.add(Ansi.green("　中了 " + hit + " 个！收获 " + cash + " 元现金和一堆小玩具（心情 +" + (hit * 3) + "）"));
            s.character.money += cash;
            gs.changeMood(hit * 3);
            if (hit == 3) out.add(Ansi.pink("　🏆 全中！夜市老板都看呆了"));
        }
        s.nightMarketVisits++;
        // 夜市摊主好感
        NPC zhu = s.npcs.stream().filter(n -> "nightboss".equals(n.role)).findFirst().orElse(null);
        if (zhu != null) {
            zhu.affection = Math.min(100, zhu.affection + 2);
            out.add(Ansi.pink("　夜市老板娘好感 +2（" + zhu.affection + "/100）"));
        }
        int net = cash - 20;
        gs.pushEvent("🎯 套圈结算：" + (net >= 0 ? "+" : "") + net + " 元");
    }

    /* ================ 鬼市：淘古董 ================ */
    public static void antique(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"ghostmarket".equals(s.locationId)) {
            out.add(Ansi.red("鬼市凌晨才开门（move 鬼市，0-5 点），神秘商贩只在这个点摆摊"));
            return;
        }
        if (s.character.money < 50) {
            out.add(Ansi.red("淘一件古董 50 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 50;
        gs.advanceTime(20);
        double luckP = 0.30 + (s.character.luck - 20) / 100.0;   // 运气加成出真品概率
        String[] items = {"青花小碗", "铜钱一串", "旧怀表", "玉扳指", "线装古书"};
        String item = items[gs.rnd().nextInt(items.length)];
        if (gs.rnd().nextDouble() < luckP) {
            int val = 100 + gs.rnd().nextInt(401);
            s.character.money += val;
            s.character.prestige += 2;
            out.add(Ansi.green("🪙 你花 50 元淘到一件「" + item + "」，商贩说是传家宝，转手卖 " + val + " 元！净赚 " + (val - 50) + " 元，声望 +2"));
            gs.changeMood(8);
        } else {
            out.add(Ansi.red("🕯️ 你花 50 元买了件「" + item + "」，回去一查是高仿地摊货……赔了 50 元"));
            gs.changeMood(-4);
        }
        s.ghostMarketVisits++;
        NPC ghost = s.npcs.stream().filter(n -> "ghostboss".equals(n.role)).findFirst().orElse(null);
        if (ghost != null) {
            ghost.affection = Math.min(100, ghost.affection + 2);
            out.add(Ansi.pink("　神秘商贩眯眼笑，好感 +2（" + ghost.affection + "/100）"));
        }
    }

    /* ================ 鬼市：求签 ================ */
    public static void fortune(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"ghostmarket".equals(s.locationId)) {
            out.add(Ansi.red("鬼市才有那位算命的老瞎子（move 鬼市，0-5 点）"));
            return;
        }
        if (s.character.money < 20) {
            out.add(Ansi.red("求签 20 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 20;
        gs.advanceTime(10);
        int roll = gs.rnd().nextInt(100);
        if (roll < 30 + (s.character.luck - 20) / 2) {
            s.character.luck++;
            out.add(Ansi.green("🔮 你摇出一支上上签！老瞎子眯眼说：「小伙子，这几天运气不错。」运气 +1"));
            gs.changeMood(5);
        } else if (roll < 75) {
            gs.changeMood(4);
            out.add(Ansi.gold("🔮 中吉签：「平平淡淡才是真。」心情 +4"));
        } else {
            gs.changeMood(-3);
            out.add(Ansi.gray("🔮 下下签……老瞎子叹气摇头，你心里一沉（心情 -3）"));
        }
        s.ghostMarketVisits++;
        NPC ghost = s.npcs.stream().filter(n -> "ghostboss".equals(n.role)).findFirst().orElse(null);
        if (ghost != null) {
            ghost.affection = Math.min(100, ghost.affection + 1);
            out.add(Ansi.pink("　老瞎子觉得你有缘，好感 +1（" + ghost.affection + "/100）"));
        }
    }
}
