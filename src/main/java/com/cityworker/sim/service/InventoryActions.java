package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 背包与换装：查看已购物品，穿戴/卸下服装手表数码装备。
 * 命令：bag / wear <编号|名称> / takeoff <编号|名称>
 */
public final class InventoryActions {

    private InventoryActions() {}

    /** 查看背包：分类展示物品与穿戴状态、当前穿戴合计属性 */
    public static void bag(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.inventory.isEmpty()) {
            out.add(Ansi.yellow("背包空空如也。去商场（move 商场 → shop）买点东西吧。"));
            return;
        }
        out.add(Ansi.banner("我的背包", "INVENTORY · " + s.inventory.size() + " 件物品"));
        out.add(Ansi.gray("  wear <编号/名称> 穿戴　takeoff <编号/名称> 卸下"));

        Map<String, List<GameConfig.MallItemDef>> items = new LinkedHashMap<>();
        for (String id : s.inventory) {
            GameConfig.MallItemDef it = gs.cfg().mall.stream()
                    .filter(m -> m.id.equals(id)).findFirst().orElse(null);
            if (it != null) items.computeIfAbsent(it.category, k -> new ArrayList<>()).add(it);
        }
        String[] catName = {
                "clothes:👕 衣服", "pants:👖 裤子", "shoes:👞 鞋子", "watch:⌚ 手表",
                "digital:📱 数码", "accessory:🕶️ 配饰", "pet:🐾 宠物", "health:💊 药品"
        };
        int idx = 0;
        for (String cat : catName) {
            String[] kv = cat.split(":");
            List<GameConfig.MallItemDef> list = items.get(kv[0]);
            if (list == null || list.isEmpty()) continue;
            out.add(Ansi.gold(kv[1]));
            for (GameConfig.MallItemDef it : list) {
                idx++;
                boolean on = s.equipped.contains(it.id);
                String bonus = "";
                if (it.charm > 0) bonus += "魅力+" + it.charm + " ";
                if (it.prestige > 0) bonus += "声望+" + it.prestige + " ";
                if (it.mood > 0) bonus += "心情+" + it.mood + " ";
                if (it.socialBonus > 0) bonus += "社交+" + Math.round(it.socialBonus * 100) + "% ";
                String line = Ansi.cyan(idx + ". ") + Ansi.bold(it.name)
                        + Ansi.gray("  " + bonus.trim());
                if (gs.isWearable(it.category)) {
                    line += on ? Ansi.green(" ✔穿戴中") : Ansi.darkGray(" 未穿戴");
                } else {
                    line += Ansi.cyan(" 拥有");
                }
                out.add("  " + line);
            }
        }
        out.add("");
        out.add(Ansi.gray("　当前穿戴加成："
                + "✨魅力+" + (gs.gearCharm() - s.character.charm)
                + "　⭐声望+" + (gs.gearPrestige() - s.character.prestige)
                + (gs.gearMoodBonus() > 0 ? "　💖每天心情+" + gs.gearMoodBonus() : "")
                + (gs.socialBonus() > 0 ? "　💬社交+" + Math.round(gs.socialBonus() * 100) + "%" : "")));
    }

    /** 穿戴一件物品 */
    public static void wear(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：wear <编号/名称>，先输入 bag 查看背包。"));
            return;
        }
        GameConfig.MallItemDef it = resolve(gs, args[0]);
        if (it == null) {
            out.add(Ansi.red("背包里没有这件物品。输入 bag 查看。"));
            return;
        }
        if (!gs.isWearable(it.category)) {
            out.add(Ansi.yellow("「" + it.name + "」不需要穿戴（宠物/药品拥有即生效）。"));
            return;
        }
        if (s.equipped.contains(it.id)) {
            out.add(Ansi.gray("「" + it.name + "」已经穿在身上了。"));
            return;
        }
        // 同类别互斥：穿上新装备自动换下同类的旧装备（如都是衣服只能穿一件）
        String swapped = null;
        for (String id : new ArrayList<>(s.equipped)) {
            GameConfig.MallItemDef other = gs.cfg().mall.stream()
                    .filter(m -> m.id.equals(id)).findFirst().orElse(null);
            if (other != null && other.category.equals(it.category)) {
                s.equipped.remove(id);
                swapped = other.name;
            }
        }
        s.equipped.add(it.id);
        int charm = gs.gearCharm(), prestige = gs.gearPrestige();
        out.add(Ansi.green("✅ 穿上「" + it.name + "」"
                + (swapped != null ? "（换下了「" + swapped + "」）" : "")));
        StringBuilder sb = new StringBuilder();
        if (it.charm > 0) sb.append("魅力+" + it.charm + " ");
        if (it.prestige > 0) sb.append("声望+" + it.prestige + " ");
        if (it.socialBonus > 0) sb.append("社交+" + Math.round(it.socialBonus * 100) + "% ");
        if (sb.length() > 0) out.add(Ansi.cyan("　效果：" + sb.toString().trim()));
        out.add(Ansi.gray("　现在总魅力 " + charm + "，总声望 " + prestige + "。"));
        gs.advanceTime(1);
    }

    /** 卸下一件物品 */
    public static void takeoff(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：takeoff <编号/名称>，先输入 bag 查看背包。"));
            return;
        }
        GameConfig.MallItemDef it = resolve(gs, args[0]);
        if (it == null) {
            out.add(Ansi.red("背包里没有这件物品。输入 bag 查看。"));
            return;
        }
        if (!s.equipped.contains(it.id)) {
            out.add(Ansi.yellow("「" + it.name + "」当前没有穿戴。"));
            return;
        }
        s.equipped.remove(it.id);
        out.add(Ansi.gray("你换下了「" + it.name + "」，放回背包。"));
        out.add(Ansi.gray("　现在总魅力 " + gs.gearCharm() + "，总声望 " + gs.gearPrestige() + "。"));
        gs.advanceTime(1);
    }

    /** 按编号（与 bag 展示一致的分类顺序）或物品 id/名称解析 */
    private static GameConfig.MallItemDef resolve(GameService gs, String arg) {
        int n = GameService.parseInt(arg, -1);
        if (n >= 1) {
            String[] catOrder = {"clothes", "pants", "watch", "digital", "pet", "health"};
            int i = 0;
            for (String cat : catOrder) {
                for (String id : gs.state().inventory) {
                    GameConfig.MallItemDef it = gs.cfg().mall.stream()
                            .filter(m -> m.id.equals(id)).findFirst().orElse(null);
                    if (it != null && it.category.equals(cat)) {
                        i++;
                        if (i == n) return it;
                    }
                }
            }
        }
        return gs.cfg().mall.stream()
                .filter(m -> gs.state().inventory.contains(m.id)
                        && (m.id.equals(arg) || m.name.equals(arg)))
                .findFirst().orElse(null);
    }
}
