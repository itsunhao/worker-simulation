package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 小商品批发 + 摆地摊（卖货模式）：货源来自临江小商品批发城 */
public final class WholesaleActions {

    private WholesaleActions() {}

    /** 批发城：查看/购买商品。wholesale 或 wholesale buy <编号> [数量] */
    public static void wholesale(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"wholesale".equals(s.locationId)) {
            out.add(Ansi.red("批发城在临江小商品批发城（move 小商品批发）"));
            return;
        }
        if (args.length > 0 && "buy".equals(args[0])) {
            buy(gs, out, args);
            return;
        }
        List<GameConfig.WholesaleDef> list = gs.cfg().wholesale;
        if (list == null || list.isEmpty()) {
            out.add(Ansi.red("今天批发城没开门，明天再来。"));
            return;
        }
        out.add(Ansi.banner("临江小商品批发城", "WHOLESALE"));
        out.add(Ansi.gray("　一箱箱的袜子手机壳，摆摊人的进货圣地。"));
        for (int i = 0; i < list.size(); i++) {
            GameConfig.WholesaleDef w = list.get(i);
            int have = s.wholesaleStock.getOrDefault(w.id, 0);
            out.add(Ansi.cyan((i + 1) + ". ") + w.icon + " " + Ansi.bold(w.name)
                    + Ansi.gray("（" + w.unit + "）")
                    + Ansi.gold(" 批发" + w.price + "元")
                    + Ansi.green(" 摆摊约卖" + w.sellBase + "元")
                    + Ansi.gray(" 库存" + have + "单位"));
        }
        out.add("");
        out.add(Ansi.yellow("购买：wholesale buy <编号> [数量]　如 wholesale buy 1 5"));
        out.add(Ansi.yellow("进货后去大街摆摊：stall（选货）或 stall <编号> [数量]"));
        out.add(Ansi.gray("　进货价低、卖价看人，摆摊有城管风险，也有暴利的机会。"));
    }

    private static void buy(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：wholesale buy <编号> [数量]"));
            return;
        }
        GameConfig.WholesaleDef w = resolve(gs, args[1]);
        if (w == null) {
            out.add(Ansi.red("没有这个商品，输入 wholesale 查看列表。"));
            return;
        }
        int qty = 1;
        if (args.length >= 3) {
            qty = GameService.parseInt(args[2], 1);
            if (qty <= 0) qty = 1;
            if (qty > 99) {
                out.add(Ansi.red("一次最多进 99 单位货。"));
                return;
            }
        }
        int cost = w.price * qty;
        if (s.character.money < cost) {
            out.add(Ansi.red("进货要 " + cost + " 元，差 " + (cost - s.character.money) + " 元。"));
            return;
        }
        s.character.money -= cost;
        s.wholesaleStock.merge(w.id, qty, Integer::sum);
        gs.advanceTime(20);
        out.add(Ansi.cyan("📦 你进了 " + qty + " 单位" + w.icon + w.name + "（" + w.unit + "），花了 " + cost + " 元。"));
        out.add(Ansi.green("　当前库存 " + s.wholesaleStock.get(w.id) + " 单位。去大街 stall 摆摊卖货吧！"));
    }

    /** 摆地摊：stall 查看可卖货物 / stall <编号> [数量] 开卖 */
    public static void stall(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("摆摊得去大街（move 大街），那里人流最旺。"));
            return;
        }
        if (s.wholesaleStock.isEmpty()) {
            out.add(Ansi.red("你两手空空，拿什么摆摊？去小商品批发城进货（move 小商品批发，再 wholesale buy）。"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.banner("摆摊选货", "STALL"));
            out.add(Ansi.gray("　支起小摊，一次摆 2 小时，卖 1 单位货。"));
            List<GameConfig.WholesaleDef> list = gs.cfg().wholesale;
            int i = 0;
            for (Map.Entry<String, Integer> e : s.wholesaleStock.entrySet()) {
                if (e.getValue() <= 0) continue;
                GameConfig.WholesaleDef w = list.stream().filter(x -> x.id.equals(e.getKey())).findFirst().orElse(null);
                if (w == null) continue;
                i++;
                int est = (int) Math.round(w.sellBase * (1 + gs.gearCharm() * 0.015 + s.character.prestige * 0.008));
                out.add(Ansi.cyan(i + ". ") + w.icon + " " + Ansi.bold(w.name)
                        + Ansi.gray("（库存" + e.getValue() + "单位）")
                        + Ansi.green(" 预计每单位卖" + est + "元"));
            }
            out.add("");
            out.add(Ansi.yellow("开卖：stall <编号> [数量]　如 stall 1 2（默认卖 1 单位）"));
            return;
        }
        GameConfig.WholesaleDef w = resolve(gs, args[0]);
        if (w == null) {
            out.add(Ansi.red("没有这个货，输入 stall 查看可卖商品。"));
            return;
        }
        int have = s.wholesaleStock.getOrDefault(w.id, 0);
        if (have <= 0) {
            out.add(Ansi.red("这个货没库存了，去批发城进点货。"));
            return;
        }
        int qty = 1;
        if (args.length >= 2) {
            qty = GameService.parseInt(args[1], 1);
            if (qty <= 0) qty = 1;
            if (qty > have) {
                out.add(Ansi.red("库存只有 " + have + " 单位，卖不了那么多。"));
                return;
            }
        }
        s.wholesaleStock.put(w.id, have - qty);
        gs.advanceTime(120);
        gs.changeStamina(-5);
        gs.changeHunger(-4);
        // 城管风险
        double fineChance = 0.12 - s.character.luck * 0.002;
        if (gs.rnd().nextDouble() < fineChance) {
            int fine = 30 + gs.rnd().nextInt(70);
            s.character.money -= fine;
            gs.changeMood(-10);
            out.add(Ansi.red("🚨 城管来了！" + qty + " 单位" + w.icon + w.name + "被没收，罚款 " + fine + " 元，心情-10。"));
            return;
        }
        double unit = w.sellBase * (1 + gs.gearCharm() * 0.015 + s.character.prestige * 0.008)
                * (0.85 + gs.rnd().nextDouble() * 0.5) * (1 + s.character.luck * 0.004)
                * ExtraActions.weatherStallBonus(gs);
        int earned = (int) Math.round(unit * qty);
        s.character.money += earned;
        gs.changeMood(3);
        out.add(Ansi.cyan("🏪 你支起小摊，卖" + qty + "单位" + w.icon + w.name + "，吆喝了两小时……"));
        out.add(Ansi.green("　💰 净赚 " + earned + " 元！" + weatherHint(gs)));
        if (gs.rnd().nextDouble() < 0.18 + s.character.luck * 0.005) {
            out.add(Ansi.gold("　✨ 生意出奇的好，被大妈们围得水泄不通，多卖了不少！"));
        }
        if (gs.rnd().nextDouble() < 0.1) {
            out.add(Ansi.gray("　👀 隔壁摊主瞟了你一眼：『进货眼光不错嘛。』"));
        }
    }

    /** 天气对摆摊的提示文案 */
    private static String weatherHint(GameService gs) {
        String w = gs.state().weatherId == null ? "sunny" : gs.state().weatherId;
        return switch (w) {
            case "light_rain" -> "（🌦️ 下着小雨，生意打了些折扣）";
            case "heavy_rain" -> "（🌧️ 大雨把顾客都赶跑了……）";
            case "snow" -> "（❄️ 天冷路滑，逛街的人少了）";
            case "cloudy" -> "（⛅ 阴天，生意平平）";
            default -> "（☀️ 大晴天，正是摆摊好时候！）";
        };
    }

    /** 商品解析：支持编号（批发列表顺序）或商品 id */
    private static GameConfig.WholesaleDef resolve(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        List<GameConfig.WholesaleDef> list = gs.cfg().wholesale;
        if (idx >= 1 && idx <= list.size()) return list.get(idx - 1);
        return list.stream().filter(w -> w.id.equals(arg)).findFirst().orElse(null);
    }
}
