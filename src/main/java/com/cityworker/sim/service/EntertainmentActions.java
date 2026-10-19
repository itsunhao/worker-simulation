package com.cityworker.sim.service;

import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * v2.2 娱乐场所系统：KTV（点公主/少爷陪唱）+ 私人会所（点男/女技师按摩）
 * 好感度培养：消费 + 私下交流（entchat），好感越高态度越亲密。
 * 态度受玩家资产（现金+存款+车+房）影响：穷被冷落，有钱被追捧。
 */
public final class EntertainmentActions {

    private EntertainmentActions() {}

    /** 陪侍 / 技师定义：id, 名字, 性别, 角色, 地点, 价位/小时, 风格 */
    public static class EntDef {
        public String id, name, gender, role, loc, style;
        public int price;
        public EntDef(String id, String name, String gender, String role, String loc, int price, String style) {
            this.id = id; this.name = name; this.gender = gender; this.role = role;
            this.loc = loc; this.price = price; this.style = style;
        }
    }

    public static final List<EntDef> ENTS = List.of(
        // KTV 公主（女）
        new EntDef("ktv_xiaomei", "小美", "female", "陪唱公主", "ktv", 120, "甜美嗓音，点歌从不让场子冷下来"),
        new EntDef("ktv_lili", "莉莉", "female", "陪唱公主", "ktv", 150, "很会聊天，劝酒劝得你心服口服"),
        new EntDef("ktv_nana", "娜娜", "female", "陪唱公主", "ktv", 200, "驻唱出身，一开口全包间都安静了"),
        new EntDef("ktv_xueer", "雪儿", "female", "陪唱公主", "ktv", 260, "气质清冷，笑起来却甜得犯规"),
        // KTV 少爷（男）
        new EntDef("ktv_akai", "阿凯", "male", "陪唱少爷", "ktv", 100, "麦霸型，抢麦第一名"),
        new EntDef("ktv_aze", "阿泽", "male", "陪唱少爷", "ktv", 140, "会弹吉他，气氛组担当"),
        new EntDef("ktv_xiaojie", "小杰", "male", "陪唱少爷", "ktv", 180, "话不多，但递话筒永远恰到好处"),
        // 私人会所女技师
        new EntDef("pv_sujie", "苏姐", "female", "金牌技师", "pvclub", 200, "手法老道，从业十年"),
        new EntDef("pv_wenwen", "雯雯", "female", "精油技师", "pvclub", 150, "指法轻柔，按着按着你就睡着了"),
        new EntDef("pv_xiaoyu", "小雨", "female", "泰式技师", "pvclub", 220, "力气大得出奇，专治腰酸背痛"),
        new EntDef("pv_peipei", "佩佩", "female", "足疗技师", "pvclub", 130, "足底穴位拿捏得极准"),
        // 私人会所男技师
        new EntDef("pv_aqiang", "阿强", "male", "推拿技师", "pvclub", 160, "一双手像铁钳，又准又稳"),
        new EntDef("pv_laoliu", "老刘", "male", "老中医技师", "pvclub", 240, "正骨推拿，咔咔两下就松了"),
        new EntDef("pv_xiaosong", "小宋", "male", "运动恢复师", "pvclub", 180, "专做运动后的肌肉放松")
    );

    private static EntDef find(String id) {
        return ENTS.stream().filter(e -> e.id.equals(id)).findFirst().orElse(null);
    }

    public static List<EntDef> byLoc(String loc) {
        return ENTS.stream().filter(e -> e.loc.equals(loc)).toList();
    }

    /** 玩家资产档次：0穷 1普通 2有钱 3大款（用于娱乐NPC态度） */
    public static int wealthRank(GameService gs) {
        GameState s = gs.state();
        long wealth = s.character.money + s.character.deposit
                + (long) s.ownedEstates.size() * 100000L
                + (long) s.ownedCars.size() * 50000L;
        if (wealth >= 1_000_000) return 3;
        if (wealth >= 100_000) return 2;
        if (wealth >= 10_000) return 1;
        return 0;
    }

    public static String wealthAttitude(int rank) {
        return switch (rank) {
            case 0 -> "冷淡"; case 1 -> "客气"; case 2 -> "热情"; default -> "谄媚";
        };
    }

    // ============ KTV ============

    public static void ktv(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"ktv".equals(s.locationId)) {
            out.add(Ansi.red("KTV 在霓虹街那头（move KTV）。"));
            return;
        }
        if (args.length == 0) {
            listEnt(gs, out, "ktv");
            return;
        }
        EntDef e = find(args[0]);
        if (e == null || !"ktv".equals(e.loc)) {
            out.add(Ansi.red("没有这个公主/少爷，输入 ktv 看花名册。"));
            return;
        }
        int hours = args.length > 1 ? GameService.parseInt(args[1], 1) : 1;
        hours = Math.max(1, Math.min(4, hours));
        int cost = e.price * hours;
        if (s.character.money < cost) {
            out.add(Ansi.red("包间加小费要 " + cost + " 元（" + e.name + " " + e.price + "元/小时 ×" + hours + "h），你手头不够。"));
            return;
        }
        s.character.money -= cost;
        gs.advanceTime(hours * 60);
        gs.changeMood(6 + hours * 2);
        gs.changeStamina(-4 * hours);
        int aff = 4 + hours * 2;
        addAff(gs, e.id, aff);
        s.ktvVisits++;
        int rank = wealthRank(gs);
        String att = wealthAttitude(rank);
        out.add(Ansi.banner("🎤 KTV 包间", e.name + " · 陪唱 " + hours + " 小时"));
        out.add(Ansi.gray("　" + e.style + "。" + (rank >= 2 ? "她/他见你出手阔绰，唱得更卖力了。" : "她/他照常笑着陪你唱歌。")));
        String line = pick(gs, new String[]{
            "你们合唱了一首《朋友》，全场气氛拉满。",
            "她/他给你点了首你最拿手的歌，还带头鼓掌。",
            "喝着果盘和啤酒，你们聊到了小时候的梦想。",
            "她/他讲了个包厢八卦，你们笑作一团。"});
        out.add(Ansi.cyan("　" + line));
        out.add(Ansi.green("　💸 花费 " + cost + " 元，心情+" + (6 + hours * 2) + "，「" + e.name + "」好感 +" + aff
                + "（当前 " + affOf(s, e.id) + "/100，" + att + "）"));
        gs.pushEvent(Ansi.cyan("🎤 KTV 消费 " + cost + " 元，" + e.name + "好感 +" + aff));
    }

    // ============ 私人会所 ============

    public static void pv(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"pvclub".equals(s.locationId)) {
            out.add(Ansi.red("私人会所在城北会员制（move 私人会所）。"));
            return;
        }
        if (args.length == 0) {
            listEnt(gs, out, "pvclub");
            return;
        }
        EntDef e = find(args[0]);
        if (e == null || !"pvclub".equals(e.loc)) {
            out.add(Ansi.red("没有这位技师，输入 pv 看技师名单。"));
            return;
        }
        int cost = e.price;
        if (s.character.money < cost) {
            out.add(Ansi.red("一次服务 " + cost + " 元（" + e.name + "），你手头不够。"));
            return;
        }
        s.character.money -= cost;
        gs.advanceTime(60);
        gs.changeStamina(14);
        gs.changeMood(10);
        int aff = 5;
        addAff(gs, e.id, aff);
        s.pvclubVisits++;
        int rank = wealthRank(gs);
        String att = wealthAttitude(rank);
        out.add(Ansi.banner("💆 私人会所 · 贵宾房", e.name + " · " + e.role));
        out.add(Ansi.gray("　" + e.style + "。" + switch (rank) {
            case 0 -> "她/他按部就班地服务着，话不多。";
            case 1 -> "她/他客气地询问力度，服务很周到。";
            case 2 -> "她/他笑着说「先生/女士常来啊」，手法格外用心。";
            default -> "她/他亲自去泡了壶好茶，毕恭毕敬地伺候着。";
        }));
        out.add(Ansi.cyan("　一个钟下来，筋骨松了，魂儿也回来了。"));
        out.add(Ansi.green("　💸 花费 " + cost + " 元，体力+14，心情+10，「" + e.name + "」好感 +" + aff
                + "（当前 " + affOf(s, e.id) + "/100，" + att + "）"));
        gs.pushEvent(Ansi.cyan("💆 私人会所消费 " + cost + " 元，" + e.name + "好感 +" + aff));
    }

    /** 私下交流：好感≥60 解锁，关系越近话题越私密 */
    public static void entChat(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：entchat <编号/名字>，先 ktv 或 pv 查看花名册。"));
            return;
        }
        EntDef e = find(args[0]);
        if (e == null) {
            out.add(Ansi.red("没有这个人。"));
            return;
        }
        int aff = affOf(s, e.id);
        if (aff < 60) {
            out.add(Ansi.red("「" + e.name + "」和你还没熟到能私下聊天的地步（好感 " + aff + "/100，需要≥60）。"));
            out.add(Ansi.gray("　多去照顾她/他的生意（" + (e.loc.equals("ktv") ? "ktv" : "pv") + " " + e.id + "），好感会涨。"));
            return;
        }
        int today = s.entChatDay.getOrDefault(e.id, 0);
        if (today >= 2) {
            out.add(Ansi.gray("　" + e.name + "今天已经和你聊了不少，约了明天再见。"));
            return;
        }
        s.entChatDay.put(e.id, today + 1);
        gs.advanceTime(30);
        gs.changeMood(4);
        int gain = 3 + aff / 25;
        addAff(gs, e.id, gain);
        int rank = wealthRank(gs);
        String att = wealthAttitude(rank);
        String title = e.gender.equals("female") ? "她" : "他";
        String line;
        if (aff >= 90) {
            line = pick(gs, new String[]{
                "「也就跟你，我才说这些。」" + title + "小声讲了讲自己的身世，眼里有光。",
                "你们并肩坐着，谁都没说话，却觉得比说了什么都安心。",
                "她/他给你看了手机里养的小猫照片：「不许说出去哦。」"});
        } else if (aff >= 75) {
            line = pick(gs, new String[]{
                "你们聊起了离开老家的原因，突然都沉默了。",
                "她/他教了你一句她/他家乡的方言，你学得四不像，两人笑成一团。",
                "「在这儿待久了，也就你还把我当朋友。」" + title + "小声说。"});
        } else {
            line = pick(gs, new String[]{
                "你们聊了聊这座城市的夜晚，和夜班收工后的吃食。",
                "她/他说最近攒钱想给家里寄回去，你点了点头。",
                "聊起喜欢的歌/按摩手法，你们发现还挺聊得来。"});
        }
        out.add(Ansi.banner("💬 私下交流", e.name + " · 好感 " + aff + " → " + affOf(s, e.id)));
        out.add(Ansi.cyan("　" + line));
        out.add(Ansi.green("　心情+4，「" + e.name + "」好感 +" + gain + "（当前 " + affOf(s, e.id) + "/100，" + att + "）"));
        // 高好感偶尔送小礼
        if (aff >= 80 && gs.rnd().nextDouble() < 0.3) {
            int gift = 20 + gs.rnd().nextInt(60);
            s.character.money += gift;
            out.add(Ansi.gold("　🎁 " + e.name + "硬塞给你一张 " + gift + " 元的代金券：「拿着，下次来用。」"));
        }
    }

    // ============ 内部 ============

    private static void listEnt(GameService gs, List<String> out, String loc) {
        GameState s = gs.state();
        if ("ktv".equals(loc)) {
            out.add(Ansi.banner("🎤 天上人间 KTV · 花名册", "SING & DRINK"));
            out.add(Ansi.gray("　点一位公主/少爷陪你唱歌喝酒，按小时计费。关系处好了可以私下交流（entchat）。"));
        } else {
            out.add(Ansi.banner("💆 云水间私人会所 · 技师名单", "VIP SPA"));
            out.add(Ansi.gray("　金牌技师随你点，按次计费。常来照顾生意，会有意想不到的交情（entchat）。"));
        }
        List<EntDef> list = byLoc(loc);
        out.add("");
        for (EntDef e : list) {
            int aff = affOf(s, e.id);
            String star = aff >= 90 ? "❤ " : aff >= 60 ? "💗 " : "　";
            out.add(Ansi.cyan("  " + (e.gender.equals("female") ? "👩" : "👨") + " " + e.name)
                    + Ansi.gray("（" + e.role + "）") + Ansi.gray("  " + e.price + "元" + (loc.equals("ktv") ? "/小时" : "/次"))
                    + Ansi.darkGray("　" + e.style)
                    + (aff > 0 ? Ansi.pink("　" + star + "好感 " + aff) : ""));
        }
        out.add("");
        out.add(Ansi.yellow(loc.equals("ktv")
                ? "　点单：ktv <编号> [小时]（如 ktv ktv_xiaomei 2）｜交流：entchat <编号>"
                : "　点单：pv <编号>（如 pv pv_sujie）｜交流：entchat <编号>"));
        out.add(Ansi.gray("　你的身家会影响她们/他们的态度：钱多人客气，钱少脸难看。"));
    }

    private static int affOf(GameState s, String id) {
        return s.entAffection.getOrDefault(id, 0);
    }

    private static void addAff(GameService gs, String id, int gain) {
        GameState s = gs.state();
        s.entAffection.put(id, Math.min(100, affOf(s, id) + gain));
    }

    private static String pick(GameService gs, String[] arr) {
        return arr[gs.rnd().nextInt(arr.length)];
    }
}
