package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * v1.9 都市生活充实包
 * 覆盖：打零工 / 菜场砍价 / 花店插花 / 台球对局 / 会所应酬 / 街头小报 /
 *       夜市打气球 / 夜市捞金鱼 / 公园相亲角 / 公园喂鸽子 /
 *       银行贷款 / 银行理财 / 每日任务 / 天气系统
 * 所有玩法同时支持终端指令与图形界面按钮。
 */
public final class ExtraActions {

    private ExtraActions() {}

    // ==================== 天气系统 ====================

    public static final String[] WEATHER_POOL = {
            "sunny", "sunny", "sunny", "cloudy", "cloudy", "light_rain", "light_rain", "heavy_rain", "snow"
    };

    public static String weatherName(String id) {
        return switch (id == null ? "sunny" : id) {
            case "cloudy" -> "多云";
            case "light_rain" -> "小雨";
            case "heavy_rain" -> "大雨";
            case "snow" -> "下雪";
            default -> "晴";
        };
    }

    public static String weatherIcon(String id) {
        return switch (id == null ? "sunny" : id) {
            case "cloudy" -> "⛅";
            case "light_rain" -> "🌦️";
            case "heavy_rain" -> "🌧️";
            case "snow" -> "❄️";
            default -> "☀️";
        };
    }

    public static String weatherDesc(String id) {
        return switch (id == null ? "sunny" : id) {
            case "cloudy" -> "云层很厚，光线柔和，是个出门的好日子";
            case "light_rain" -> "细雨绵绵，摆摊生意会清淡些，记得带伞";
            case "heavy_rain" -> "大雨倾盆，摆摊和露天生意基本泡汤";
            case "snow" -> "雪花飘落，空气清冷，露天活计要受点影响";
            default -> "艳阳高照，摆摊逛街都精神";
        };
    }

    /** 天气对摆摊/露天生意的收益加成 */
    public static double weatherStallBonus(GameService gs) {
        return switch (gs.state().weatherId == null ? "sunny" : gs.state().weatherId) {
            case "cloudy" -> 1.0;
            case "light_rain" -> 0.78;
            case "heavy_rain" -> 0.55;
            case "snow" -> 0.88;
            default -> 1.12;   // sunny 晴天生意好
        };
    }

    /** 每日清晨刷新天气（在 rolloverDay 中调用） */
    public static String rollWeather(GameService gs) {
        GameState s = gs.state();
        s.weatherId = WEATHER_POOL[gs.rnd().nextInt(WEATHER_POOL.length)];
        return weatherIcon(s.weatherId) + " 今天" + weatherName(s.weatherId) + "，" + weatherDesc(s.weatherId);
    }

    /** weather：查看今日天气 */
    public static void weather(GameService gs, List<String> out) {
        GameState s = gs.state();
        out.add(Ansi.banner("今日天气", "CITY WEATHER"));
        out.add(Ansi.cyan("　" + weatherIcon(s.weatherId) + " " + weatherName(s.weatherId) + "　" + weatherDesc(s.weatherId)));
        out.add(Ansi.gray("　晴天摆摊生意好；雨天露天生意清淡，室内活动不受影响。"));
    }

    // ==================== 打零工（大街/百味鸡/菜市场/花店） ====================

    /** gig：地点限定的临时帮工，每天最多 2 次 */
    public static void gig(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.lastGigDay != s.day()) { s.lastGigDay = s.day(); s.gigCount = 0; }
        if (s.gigCount >= 2) {
            out.add(Ansi.yellow("今天的零工已经打满了（2 次），明天再来帮工吧。"));
            return;
        }
        String loc = s.locationId;
        int earn;
        String flavor;
        NPC npc = null;
        switch (loc) {
            case "street" -> {
                earn = 45 + gs.rnd().nextInt(26) + s.character.charm;   // 发传单看嘴皮子
                flavor = "你在街角帮快餐店发了 2 小时传单，老板娘塞给你一份盒饭";
            }
            case "braised" -> {
                earn = 50 + gs.rnd().nextInt(31);
                npc = byRole(s, "shop-braised");
                flavor = "你在老王百味鸡帮了 2 小时忙，卤香熏得你直流口水";
            }
            case "market" -> {
                earn = 55 + gs.rnd().nextInt(31) + s.character.str;     // 理货看力气
                flavor = "你在菜市场帮摊主理了 2 小时货，忙得脚不沾地";
            }
            case "flower" -> {
                earn = 40 + gs.rnd().nextInt(26);
                npc = byRole(s, "shop-flower");
                flavor = "你在花店帮忙送了一下午花，花香沾了一身";
            }
            default -> {
                out.add(Ansi.red("这里没有零工可打。试试：大街发传单、百味鸡帮工、菜市场理货、花店送花。"));
                return;
            }
        }
        if (s.character.stamina < 15) {
            out.add(Ansi.red("体力不够（<15），打不动零工了，先休息吧。"));
            return;
        }
        s.gigCount++;
        gs.advanceTime(120);
        gs.changeStamina(-12);
        gs.changeHunger(-6);
        s.character.money += earn;
        out.add(Ansi.cyan("💼 " + flavor + "……"));
        out.add(Ansi.green("　💰 打零工收入 +" + earn + " 元（体力 -12）"));
        if (npc != null) {
            npc.affection = Math.min(100, npc.affection + 1);
            out.add(Ansi.pink("　💬 " + npc.name + "：「辛苦你了，下次还来啊！」好感 +1"));
        }
        if (gs.rnd().nextInt(100) < 12) {
            int tip = 5 + gs.rnd().nextInt(15);
            s.character.money += tip;
            out.add(Ansi.gold("　✨ 客人看你手脚麻利，多给了 " + tip + " 元小费！"));
        }
        gs.pushEvent("💼 打零工 +" + earn + " 元");
    }

    // ==================== 菜市场：砍价买菜 ====================

    /** bargain：菜市场砍价买菜，运气越好折扣越大 */
    public static void bargain(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"market".equals(s.locationId)) {
            out.add(Ansi.red("砍价得去菜市场（move 菜市场）。"));
            return;
        }
        List<GameConfig.FoodDef> pool = new ArrayList<>();
        for (GameConfig.FoodDef f : gs.cfg().foods) {
            if (("market".equals(f.place) || "any".equals(f.place)) && f.cost <= 60 && f.cost > 0) pool.add(f);
        }
        if (pool.isEmpty()) { out.add(Ansi.gray("今天菜市场的菜不怎么新鲜，改天再来。")); return; }
        GameConfig.FoodDef food = pool.get(gs.rnd().nextInt(pool.size()));
        double discount = Math.min(0.45, 0.10 + s.character.luck * 0.005);   // 运气 10% ~ 45%
        int pay = Math.max(1, (int) Math.round(food.cost * (1 - discount)));
        if (s.character.money < pay) {
            out.add(Ansi.red("连 " + pay + " 元都掏不出来了……"));
            return;
        }
        s.character.money -= pay;
        gs.advanceTime(20);
        gs.changeHunger(food.hunger);
        gs.changeStamina(food.stamina);
        gs.changeMood(food.mood);
        int saved = food.cost - pay;
        out.add(Ansi.cyan("🧾 你在菜市场跟摊主磨了半天嘴皮子，用 " + pay + " 元拿下「" + food.name + "」（原价 " + food.cost + " 元）"));
        out.add(Ansi.green("　省了 " + saved + " 元" + (food.hunger > 0 ? "，饱腹 +" + food.hunger : "") + (food.mood > 0 ? "，心情 +" + food.mood : "")));
        if (saved >= food.cost / 2) out.add(Ansi.gold("　🦾 摊主直呼：『小伙子/姑娘你这嘴是练过砍价班吧！』"));
        if (gs.rnd().nextInt(100) < 8) {
            gs.changeMood(-1);
            out.add(Ansi.gray("　（摊主翻了个白眼：『行行行，拿走拿走，别耽误我做生意。』）"));
        }
    }

    // ==================== 花店：学插花 ====================

    /** arrange：花店学插花，每 3 天 +1 魅力 */
    public static void arrange(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"flower".equals(s.locationId)) {
            out.add(Ansi.red("学插花得去花店（move 花店）。"));
            return;
        }
        if (s.character.money < 60) {
            out.add(Ansi.red("插花课学费 60 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 60;
        gs.advanceTime(60);
        gs.changeMood(2);
        out.add(Ansi.cyan("💐 小雨手把手教你插花：主花、配叶、留白……你笨手笨脚地摆弄了一个小时。"));
        if (s.lastArrangeDay < 0 || s.day() - s.lastArrangeDay >= 3) {
            if (s.character.charm < 90) {
                s.lastArrangeDay = s.day();
                s.character.charm++;
                out.add(Ansi.green("　✨ 审美提升了：魅力 +1（当前 " + s.character.charm + "），心情 +2"));
            } else {
                out.add(Ansi.gray("　你的审美已经到顶了，插花只是图一乐（心情 +2）。"));
            }
        } else {
            out.add(Ansi.gray("　刚学过插花，隔三天再来更有长进（心情 +2）。"));
        }
        NPC npc = byRole(s, "shop-flower");
        if (npc != null) {
            npc.affection = Math.min(100, npc.affection + 1);
            out.add(Ansi.pink("　小雨对你的作品点头夸赞，好感 +1（" + npc.affection + "/100）"));
        }
    }

    // ==================== 台球厅：对局 ====================

    /** battle：与凤姐赌一局台球，下注 20~200 元 */
    public static void battle(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"billiards".equals(s.locationId)) {
            out.add(Ansi.red("台球对局得去台球厅（move 台球厅）。"));
            return;
        }
        int bet = args.length > 0 ? GameService.parseInt(args[0], 50) : 50;
        if (bet < 20) bet = 20;
        if (bet > 200) bet = 200;
        if (s.character.money < bet) {
            out.add(Ansi.red("下注 " + bet + " 元，你只有 " + s.character.money + " 元。"));
            return;
        }
        gs.advanceTime(30);
        gs.changeStamina(-4);
        int player = (int) (s.character.str * 0.25 + s.character.luck * 0.35 + gs.gearCharm() * 0.3) + gs.rnd().nextInt(21);
        int feng = 48 + gs.rnd().nextInt(25);   // 凤姐球技
        NPC npc = byRole(s, "shop-billiards");
        if (player > feng) {
            s.character.money += bet;
            gs.changeMood(5);
            out.add(Ansi.cyan("🎱 你和凤姐开了一局，一杆清台的瞬间全场安静……"));
            out.add(Ansi.green("　🏆 你赢了！凤姐心服口服，掏出 " + bet + " 元。心情 +5"));
            if (npc != null) {
                npc.affection = Math.min(100, npc.affection + 2);
                out.add(Ansi.pink("　凤姐对你刮目相看，好感 +2（" + npc.affection + "/100）"));
            }
        } else {
            s.character.money -= bet;
            gs.changeMood(-3);
            out.add(Ansi.cyan("🎱 你和凤姐开了一局，最后一杆差之毫厘……"));
            out.add(Ansi.red("　你输了 " + bet + " 元。凤姐叼着烟说：『小伙子，回去再练练。』心情 -3"));
            if (npc != null) {
                npc.affection = Math.min(100, npc.affection + 1);
                out.add(Ansi.pink("　凤姐觉得你有股不服输的劲，好感 +1（" + npc.affection + "/100）"));
            }
        }
        gs.pushEvent("🎱 台球对局结算：" + (player > feng ? "+" : "-") + bet + " 元");
    }

    // ==================== 会所：商务应酬 ====================

    /** network：会所商务应酬，200 元换声望，小概率遇贵人 */
    public static void network(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"club".equals(s.locationId)) {
            out.add(Ansi.red("商务应酬得去会所（move 会所）。"));
            return;
        }
        if (s.character.money < 200) {
            out.add(Ansi.red("一场应酬 200 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        if (s.character.stamina < 10) {
            out.add(Ansi.red("体力不够撑完一场应酬，先休息吧。"));
            return;
        }
        s.character.money -= 200;
        gs.advanceTime(120);
        gs.changeStamina(-8);
        gs.changeHunger(-5);
        s.character.prestige += 1;
        gs.changeMood(3);
        out.add(Ansi.cyan("🥂 你端着酒杯在会所里周旋，从临江楼市聊到新能源风口……"));
        out.add(Ansi.green("　声望 +1，心情 +3（花掉 200 元）"));
        int roll = gs.rnd().nextInt(100);
        if (roll < 15) {
            double bonus = Math.min(0.5, s.referBonus + 0.15);
            s.referBonus = bonus;
            out.add(Ansi.gold("　🤝 一位穿西装的中年人递来名片：「我这儿正缺人，回头给你介绍个好差事。」"));
            out.add(Ansi.gold("　💼 人脉加成：下次入职薪资 +" + Math.round(bonus * 100) + "%！"));
            gs.changeMood(2);
        } else if (roll < 25) {
            int cost = 30 + gs.rnd().nextInt(60);
            s.character.money -= cost;
            out.add(Ansi.red("　😵 酒过三巡，你稀里糊涂替人买了单，多花了 " + cost + " 元……"));
        } else {
            out.add(Ansi.gray("　散场时红姐把你送出门：「常来坐坐，会所最缺你这样的体面人。」"));
            NPC npc = byRole(s, "shop-club");
            if (npc != null) {
                npc.affection = Math.min(100, npc.affection + 2);
                out.add(Ansi.pink("　红姐好感 +2（" + npc.affection + "/100）"));
            }
        }
    }

    // ==================== 大街：街头小报 ====================

    /** news：1 元买份街头小报，看趣闻与运势 */
    public static void news(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("街头小报摊只有大街上才有（move 大街）。"));
            return;
        }
        if (s.character.money < 1) {
            out.add(Ansi.red("连 1 元报纸钱都没有……"));
            return;
        }
        s.character.money -= 1;
        gs.advanceTime(10);
        String[] headlines = {
                "《临江晨报》头条：地铁三号线动工，沿线拆迁户一夜暴富，你还等什么？",
                "《都市晚报》：「某外卖骑手月入两万」——是炒作还是真相？",
                "小报角落：昨晚 21:30 双色球头奖再次轮空，奖池已滚至 9800 万！",
                "街头巷议：公园相亲角的王婆说，今年结婚率又降了，但相亲费涨了。",
                "民生版：夜市新开一家打气球摊，听说老板放水，百发百中的人不少。",
                "财经版：分析师称「会所里的生意经」才是临江最稳的生意。"
        };
        out.add(Ansi.cyan("📰 你花 1 元买了份街头小报，蹲在马路牙子上翻起来……"));
        out.add(Ansi.gray("　" + headlines[gs.rnd().nextInt(headlines.length)]));
        out.add(Ansi.gray("　今日" + weatherIcon(s.weatherId) + weatherName(s.weatherId) + "，" + weatherDesc(s.weatherId)));
        if (gs.rnd().nextInt(100) < 20) {
            int found = 10 + gs.rnd().nextInt(41);
            s.character.money += found;
            out.add(Ansi.gold("　🎟️ 报纸里夹着一张「新店开业优惠券」，顺手兑了 " + found + " 元现金！"));
        } else {
            gs.changeMood(1);
            out.add(Ansi.green("　看完小报，心情好了一点（心情 +1）"));
        }
    }

    // ==================== 夜市：打气球 ====================

    /** balloon：夜市打气球，10 元一局 10 发，全中触发成就 */
    public static void balloon(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"nightmarket".equals(s.locationId)) {
            out.add(Ansi.red("打气球得去夜市（move 夜市，晚上 19 点后开市）"));
            return;
        }
        if (s.character.money < 10) {
            out.add(Ansi.red("打气球一局 10 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 10;
        gs.advanceTime(15);
        double hitP = 0.42 + s.character.luck * 0.004 + gs.gearCharm() * 0.002;
        int hit = 0;
        for (int i = 0; i < 10; i++) if (gs.rnd().nextDouble() < hitP) hit++;
        int prize = hit * 3;
        StringBuilder sb = new StringBuilder(Ansi.gold("🎯 你端起气枪连开 10 发："));
        for (int i = 0; i < 10; i++) sb.append(i < hit ? "🟢" : "⚫");
        out.add(sb.toString());
        if (hit == 10) {
            s.balloonWins++;
            prize += 40;
            out.add(Ansi.pink("　🏆 百发百中！夜市老板脸都绿了，多给了你 40 元奖金！"));
            gs.pushEvent(Ansi.gold("🏆 打气球百发百中！"));
        } else if (hit >= 6) {
            out.add(Ansi.green("　🔫 打爆 " + hit + " 个气球，赢了个小玩偶（心情 +3）"));
            gs.changeMood(3);
        } else if (hit > 0) {
            out.add(Ansi.cyan("　中了 " + hit + " 发，勉强回本（心情 +1）"));
            gs.changeMood(1);
        } else {
            out.add(Ansi.gray("　一发未中……老板拍了拍你肩膀：「手要稳，心要狠。」"));
        }
        s.character.money += prize;
        s.nightMarketVisits++;
        NPC boss = byRole(s, "nightboss");
        if (boss != null) {
            boss.affection = Math.min(100, boss.affection + 1);
        }
        out.add(Ansi.green("　💰 奖品折现 " + prize + " 元"));
        gs.pushEvent("🎯 打气球结算：" + (prize - 10 >= 0 ? "+" : "") + (prize - 10) + " 元");
    }

    // ==================== 夜市：捞金鱼 ====================

    /** goldfish：夜市捞金鱼，有机会捞到宠物小金鱼 */
    public static void goldfish(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"nightmarket".equals(s.locationId)) {
            out.add(Ansi.red("捞金鱼得去夜市（move 夜市，晚上 19 点后开市）"));
            return;
        }
        if (s.character.money < 10) {
            out.add(Ansi.red("捞金鱼一网 10 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 10;
        gs.advanceTime(15);
        gs.changeMood(2);
        out.add(Ansi.cyan("🎣 你蹲在鱼池边，小心翼翼地下了第一网……"));
        int roll = gs.rnd().nextInt(100);
        if (roll < 40 + s.character.luck / 2) {
            if (s.inventory.contains("goldfish")) {
                s.character.money += 20;
                out.add(Ansi.green("　🐟 又捞到一条小金鱼！家里那只的伴儿有了，顺手卖给小孩换 20 元。"));
            } else {
                s.inventory.add("goldfish");
                s.goldfishGot++;
                gs.changeMood(4);
                out.add(Ansi.pink("　🐟 网里银光一闪——你捞到一条活蹦乱跳的小金鱼！"));
                out.add(Ansi.green("　🏠 小金鱼住进了你的行囊（宠物：每天心情 +1，背包可查看）"));
                gs.pushEvent(Ansi.pink("🐟 捞到小金鱼！它住进了你的背包"));
            }
        } else if (roll < 78) {
            out.add(Ansi.cyan("　网里空空如也，但溅起的水花让你凉快了不少（心情 +2）。"));
        } else {
            gs.changeMood(-1);
            out.add(Ansi.gray("　手一抖网破了，金鱼全跑了，还溅了你一身水（心情 -1）。"));
        }
        s.nightMarketVisits++;
        NPC boss = byRole(s, "nightboss");
        if (boss != null) {
            boss.affection = Math.min(100, boss.affection + 1);
            out.add(Ansi.pink("　胖姐笑呵呵：「下回再来，我给你留条最胖的！」好感 +1"));
        }
    }

    // ==================== 公园：相亲角 ====================

    /** match：公园相亲角，每天限 1 次，魅力+运气决定缘分 */
    public static void match(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) {
            out.add(Ansi.red("相亲角在城市公园的西北角（move 城市公园）。"));
            return;
        }
        if (s.lastMatchDay == s.day()) {
            out.add(Ansi.yellow("今天已经在相亲角逛过了，明天再来吧。"));
            return;
        }
        if (s.character.money < 20) {
            out.add(Ansi.red("相亲角报名费 20 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        if (s.partnerId != null && "SPOUSE".equals(gs.partnerRelation())) {
            out.add(Ansi.gray("你都结婚了，来相亲角纯属看热闹……王婆朝你直摆手。"));
            return;
        }
        s.character.money -= 20;
        s.lastMatchDay = s.day();
        gs.advanceTime(60);
        double chance = 0.40 + gs.gearCharm() * 0.006 + s.character.luck * 0.004;
        if (gs.rnd().nextDouble() < chance) {
            NPC n = gs.buildNpc("match");
            n.affection = 35 + gs.rnd().nextInt(21);
            n.relation = "FRIEND";
            n.personality = "开朗";
            s.npcs.add(n);
            s.matchCount++;
            gs.changeMood(4);
            out.add(Ansi.cyan("💘 你在相亲角转了一圈，和王婆攀谈许久，她给你介绍了一位……"));
            out.add(Ansi.pink("　" + n.genderEmoji() + " " + n.name + "（" + n.profession + "）：「你好，我是" + n.name + "，很高兴认识你。」"));
            out.add(Ansi.green("　缘分到了！" + n.name + " 好感 " + n.affection + "，已加入你的熟人列表（social 可互动）"));
            gs.pushEvent(Ansi.pink("💘 相亲角结识了 " + n.name + "（" + n.profession + "）"));
        } else {
            gs.changeMood(-2);
            out.add(Ansi.gray("💔 你在相亲角站了一小时，被三位大妈轮番打听收入和房车……"));
            out.add(Ansi.red("　王婆叹气：「条件是不错，就是这缘分还没到。」心情 -2"));
        }
    }

    // ==================== 公园：喂鸽子 ====================

    /** pigeon：公园喂鸽子，2 元买鸽食，开心为主 */
    public static void pigeon(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) {
            out.add(Ansi.red("喂鸽子得去公园广场（move 城市公园）。"));
            return;
        }
        if (s.character.money < 2) {
            out.add(Ansi.red("一包鸽食 2 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 2;
        gs.advanceTime(10);
        gs.changeMood(2);
        out.add(Ansi.cyan("🕊️ 你买了一包玉米粒，蹲在广场上喂鸽子。灰白的鸽子扑棱棱围了一地……"));
        int roll = gs.rnd().nextInt(100);
        if (roll < 12) {
            gs.changeMood(-1);
            out.add(Ansi.gray("　啪——一只白鸽精准地落在了你头上……（心情 -1）"));
        } else if (roll < 18) {
            gs.changeMood(3);
            out.add(Ansi.gold("　✨ 一只信鸽衔来一片羽毛落在你手心，像是一份小小的幸运（心情 +3）"));
        } else {
            out.add(Ansi.green("　鸽群吃饱了，咕咕叫着在你脚边踱步（心情 +2）"));
        }
    }

    // ==================== 银行：贷款 ====================

    private static final int LOAN_LIMIT = 50000;
    private static final double LOAN_DAILY_RATE = 0.001;

    /** loan：贷款查看 / 借款 / 还款 */
    public static void loan(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"bank".equals(s.locationId)) {
            out.add(Ansi.red("贷款要去银行办理（move 银行）。"));
            return;
        }
        if (args.length == 0) {
            int interest = (int) Math.ceil(s.loanPrincipal * LOAN_DAILY_RATE);
            out.add(Ansi.banner("银行贷款", "CITY COMMERCIAL BANK · LOAN"));
            out.add(Ansi.gray("　信用贷：日息 0.1%，每日清晨自动从现金扣除；现金不足则计入本金。"));
            String cur = s.loanPrincipal > 0 ? "（每日利息约 " + interest + " 元）" : "";
            out.add(Ansi.cyan("　当前贷款本金 " + s.loanPrincipal + " 元" + cur));
            out.add(Ansi.cyan("　可贷额度 " + (LOAN_LIMIT - s.loanPrincipal) + " 元（上限 5 万）"));
            out.add(Ansi.yellow("　借款：loan borrow <金额>　还款：loan repay <金额> / loan repay all"));
            return;
        }
        String act = args[0].toLowerCase();
        if ("borrow".equals(act)) {
            if (args.length < 2) { out.add(Ansi.yellow("用法：loan borrow <金额>")); return; }
            int amt = GameService.parseInt(args[1], -1);
            if (amt < 100) { out.add(Ansi.red("单笔最少借 100 元。")); return; }
            if (s.loanPrincipal + amt > LOAN_LIMIT) {
                out.add(Ansi.red("超过可贷额度（上限 5 万，当前可贷 " + (LOAN_LIMIT - s.loanPrincipal) + " 元）。"));
                return;
            }
            if (s.loanPrincipal == 0) s.loanStartDay = s.day();
            s.loanPrincipal += amt;
            s.character.money += amt;
            gs.advanceTime(30);
            out.add(Ansi.green("🏦 借款成功：+ " + amt + " 元（贷款本金 " + s.loanPrincipal + " 元，日息 0.1%）"));
            out.add(Ansi.gray("　「年轻人，记得按时还息。」柜员递来一张还款计划表。"));
        } else if ("repay".equals(act)) {
            if (s.loanPrincipal <= 0) { out.add(Ansi.gray("你目前没有贷款。")); return; }
            int amt;
            if (args.length >= 2 && "all".equalsIgnoreCase(args[1])) amt = s.loanPrincipal;
            else {
                if (args.length < 2) { out.add(Ansi.yellow("用法：loan repay <金额> 或 loan repay all")); return; }
                amt = GameService.parseInt(args[1], -1);
            }
            if (amt <= 0) { out.add(Ansi.yellow("金额要大于 0。")); return; }
            if (amt > s.loanPrincipal) amt = s.loanPrincipal;
            if (s.character.money < amt) {
                out.add(Ansi.red("现金不够还款（需 " + amt + " 元，当前 " + s.character.money + " 元）。"));
                return;
            }
            s.character.money -= amt;
            s.loanPrincipal -= amt;
            gs.advanceTime(30);
            out.add(Ansi.green("🏦 还款成功：- " + amt + " 元，剩余贷款 " + s.loanPrincipal + " 元"));
            if (s.loanPrincipal == 0) out.add(Ansi.gray("　无债一身轻，柜员朝你竖了个大拇指。"));
        } else {
            out.add(Ansi.yellow("用法：loan 查看 / loan borrow <金额> / loan repay <金额|all>"));
        }
        gs.pushState();
    }

    // ==================== 银行：理财 ====================

    private static final int FINANCE_MIN = 1000;
    private static final int FINANCE_DAYS = 7;
    private static final double FINANCE_DAILY_RATE = 0.0015;
    private static final double FINANCE_EARLY_PENALTY = 0.1;

    /** finance：理财查看 / 买入 / 赎回 */
    public static void finance(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"bank".equals(s.locationId)) {
            out.add(Ansi.red("理财要去银行办理（move 银行）。"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.banner("银行理财", "CITY COMMERCIAL BANK · WEALTH"));
            out.add(Ansi.gray("　稳盈理财：年化约 5.4%（日息 0.15%），起购 " + FINANCE_MIN + " 元，锁定 " + FINANCE_DAYS + " 天，到期自动本息到账。"));
            if (s.financePrincipal > 0) {
                int due = s.financeStartDay + FINANCE_DAYS;
                int est = (int) Math.floor(s.financePrincipal * FINANCE_DAILY_RATE * FINANCE_DAYS);
                out.add(Ansi.cyan("　当前理财本金 " + s.financePrincipal + " 元"));
                out.add(Ansi.cyan("　第 " + s.financeStartDay + " 天起息 · 第 " + due + " 天到期（预计收益 " + est + " 元）"));
                out.add(Ansi.yellow("　提前赎回：finance redeem（本金 -10% 手续费，无收益）"));
            } else {
                out.add(Ansi.gray("　暂无理财持仓。"));
                out.add(Ansi.yellow("　购买：finance buy <金额>（≥1000）"));
            }
            return;
        }
        String act = args[0].toLowerCase();
        if ("buy".equals(act)) {
            if (args.length < 2) { out.add(Ansi.yellow("用法：finance buy <金额>（≥1000）")); return; }
            if (s.financePrincipal > 0) {
                out.add(Ansi.yellow("你已有一笔未到期的理财，到期后才能再买。"));
                return;
            }
            int amt = GameService.parseInt(args[1], -1);
            if (amt < FINANCE_MIN) { out.add(Ansi.red("理财起购 " + FINANCE_MIN + " 元。")); return; }
            if (s.character.money < amt) { out.add(Ansi.red("现金不够（需 " + amt + " 元）。")); return; }
            s.character.money -= amt;
            s.financePrincipal = amt;
            s.financeStartDay = s.day();
            gs.advanceTime(30);
            int est = (int) Math.floor(amt * FINANCE_DAILY_RATE * FINANCE_DAYS);
            out.add(Ansi.green("💰 买入稳盈理财 " + amt + " 元，锁定 " + FINANCE_DAYS + " 天，预计收益 " + est + " 元。"));
            out.add(Ansi.gray("　「第 " + (s.financeStartDay + FINANCE_DAYS) + " 天清晨自动到账，请耐心等待。」"));
        } else if ("redeem".equals(act)) {
            if (s.financePrincipal <= 0) { out.add(Ansi.gray("你目前没有理财持仓。")); return; }
            int back = (int) Math.round(s.financePrincipal * (1 - FINANCE_EARLY_PENALTY));
            int fee = s.financePrincipal - back;
            s.character.money += back;
            s.financePrincipal = 0;
            s.financeStartDay = -1;
            gs.advanceTime(30);
            out.add(Ansi.green("💰 提前赎回：到账 " + back + " 元（手续费 " + fee + " 元，收益清零）"));
            out.add(Ansi.gray("　「理财有风险，提前赎回会损失收益哦。」"));
        } else {
            out.add(Ansi.yellow("用法：finance 查看 / finance buy <金额> / finance redeem"));
        }
        gs.pushState();
    }

    /** 每日结算：贷款利息 / 理财到期（在 rolloverDay 中调用，返回提示行） */
    public static List<String> settleBank(GameService gs) {
        GameState s = gs.state();
        List<String> lines = new ArrayList<>();
        // 贷款利息：日息 0.1%，现金不足部分计入本金
        if (s.loanPrincipal > 0) {
            int interest = (int) Math.ceil(s.loanPrincipal * LOAN_DAILY_RATE);
            if (s.character.money >= interest) {
                s.character.money -= interest;
                lines.add(Ansi.yellow("🏦 贷款利息 -" + interest + " 元（剩余本金 " + s.loanPrincipal + "）"));
            } else {
                int shortage = interest - s.character.money;
                s.character.money = 0;
                s.loanPrincipal += shortage;
                lines.add(Ansi.red("🏦 贷款利息 " + interest + " 元，现金不足，差额计入本金（现本金 " + s.loanPrincipal + "）"));
            }
        }
        // 理财到期：本息自动到账
        if (s.financePrincipal > 0 && s.day() - s.financeStartDay >= FINANCE_DAYS) {
            int interest = (int) Math.floor(s.financePrincipal * FINANCE_DAILY_RATE * FINANCE_DAYS);
            s.character.money += s.financePrincipal + interest;
            lines.add(Ansi.green("💰 理财到期：本金 " + s.financePrincipal + " + 收益 " + interest + " 元已到账"));
            s.financePrincipal = 0;
            s.financeStartDay = -1;
        }
        return lines;
    }

    // ==================== 每日任务 ====================

    /** 任务池：{类型, 描述, 目标次数, 奖励, 心情} */
    private static final String[][] QUEST_POOL = {
            {"work", "打工赚钱 2 次", "2", "150", "5"},
            {"study", "参加课程学习 1 次", "1", "100", "4"},
            {"scrap", "捡废品 3 次", "3", "80", "3"},
            {"stall", "摆摊卖货 1 次", "1", "120", "4"},
            {"exercise", "锻炼身体 2 次", "2", "60", "3"},
            {"read", "读书自习 2 次", "2", "60", "3"},
            {"talk", "与熟人聊天 2 次", "2", "50", "3"},
            {"eat", "吃饭 3 次", "3", "40", "2"},
            {"donate", "行善积德 1 次", "1", "60", "4"},
            {"night", "夜市/套圈/打气球 1 次", "1", "60", "3"},
            {"pray", "祈福或拜财神 1 次", "1", "40", "2"},
            {"sign", "成功入职 1 次", "1", "100", "4"}
    };

    /** 每日清晨刷新 3 个随机任务（在 rolloverDay 中调用） */
    public static String refreshQuests(GameService gs) {
        GameState s = gs.state();
        s.questDay = s.day();
        s.quests = new ArrayList<>();
        List<Integer> idx = new ArrayList<>();
        for (int i = 0; i < QUEST_POOL.length; i++) idx.add(i);
        Collections.shuffle(idx, gs.rnd());
        for (int k = 0; k < 3; k++) {
            String[] def = QUEST_POOL[idx.get(k)];
            GameState.Quest q = new GameState.Quest();
            q.id = "q" + k;
            q.type = def[0];
            q.desc = def[1];
            q.target = Integer.parseInt(def[2]);
            q.reward = Integer.parseInt(def[3]);
            q.mood = Integer.parseInt(def[4]);
            q.cur = 0;
            q.done = false;
            s.quests.add(q);
        }
        return "📋 今日任务已刷新（quest 查看）";
    }

    /** 任务进度推进：动作成功后由 GameService 调用 */
    public static void questProgress(GameService gs, String type) {
        GameState s = gs.state();
        if (s == null || s.quests == null || s.quests.isEmpty()) return;
        for (GameState.Quest q : s.quests) {
            if (q.done || !q.type.equals(type)) continue;
            q.cur = Math.min(q.target, q.cur + 1);
            if (q.cur >= q.target) {
                q.done = true;
                s.questCount++;
                s.character.money += q.reward;
                gs.changeMood(q.mood);
                gs.pushEvent(Ansi.gold("📋 每日任务完成【" + q.desc + "】奖励 " + q.reward + " 元，心情 +" + q.mood));
            }
        }
    }

    /** quest：查看今日任务 */
    public static void quest(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.quests == null || s.quests.isEmpty() || s.questDay != s.day()) {
            refreshQuests(gs);
        }
        out.add(Ansi.banner("每日任务", "DAILY QUESTS · 第" + s.day() + "天"));
        out.add(Ansi.gray("　每天清晨刷新 3 个任务，完成后奖励自动到账。"));
        out.add("");
        int done = 0;
        for (int i = 0; i < s.quests.size(); i++) {
            GameState.Quest q = s.quests.get(i);
            if (q.done) done++;
            String head = (q.done ? Ansi.green("✔ ") : Ansi.cyan((i + 1) + ". ")) + (q.done ? Ansi.gray(q.desc) : Ansi.bold(q.desc));
            out.add(head + Ansi.gold("　奖励 " + q.reward + " 元"));
            out.add(Ansi.gray("　" + progressBar(q.cur, q.target)));
        }
        out.add("");
        out.add(done == 3 ? Ansi.green("　🏆 今天的任务全部完成！你就是临江最靓的仔！")
                : Ansi.yellow("　已完成 " + done + " / 3，累计完成 " + s.questCount + " 个任务"));
    }

    private static String progressBar(int cur, int target) {
        int n = Math.max(0, Math.min(10, cur * 10 / Math.max(1, target)));
        return "\u001b[32m" + "█".repeat(n) + "\u001b[2m" + "░".repeat(10 - n) + "\u001b[0m" + " " + Math.min(cur, target) + "/" + target;
    }

    // ==================== 工具 ====================

    private static NPC byRole(GameState s, String role) {
        if (s.npcs == null) return null;
        return s.npcs.stream().filter(n -> role.equals(n.role)).findFirst().orElse(null);
    }
}
