package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.List;

/** 生活系统：吃饭 / 睡觉 / 住宿选择 */
public final class LifeActions {

    private LifeActions() {}

    public static void eat(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        List<GameConfig.FoodDef> pool = new ArrayList<>();
        List<GameConfig.FoodDef> anyPool = new ArrayList<>();
        for (GameConfig.FoodDef f : gs.cfg().foods) {
            if ("any".equals(f.place)) anyPool.add(f);
            else if (f.place.equals(s.locationId)) pool.add(f);
        }
        pool.addAll(anyPool);   // 本地特色优先，通用食品垫底
        if (pool.isEmpty()) {
            out.add(Ansi.gray("这里没什么吃的，去美食街或大街找找吧。"));
            return;
        }
        if (args.length == 0) {
            String title = switch (s.locationId) {
                case "flower" -> "花店的鲜花与盆栽";
                case "bar" -> "酒吧的吧台酒单";
                case "billiards" -> "台球厅的娱乐项目";
                case "club" -> "会所的精致消费";
                default -> "附近能吃的";
            };
            out.add(Ansi.banner(title, "MENU"));
            for (int i = 0; i < pool.size(); i++) {
                GameConfig.FoodDef f = pool.get(i);
                StringBuilder fx = new StringBuilder();
                if (f.hunger > 0) fx.append("饱腹+" + f.hunger);
                if (f.stamina > 0) fx.append(" 体力+" + f.stamina);
                if (f.stamina < 0) fx.append(" 体力" + f.stamina);
                if (f.mood > 0) fx.append(" 心情+" + f.mood);
                if (f.prestige > 0) fx.append(" 声望+" + f.prestige);
                out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(f.name)
                        + Ansi.gray("  " + f.cost + "元｜" + (fx.length() > 0 ? fx : "无增益")));
                out.add(Ansi.gray("　　" + f.desc));
            }
            out.add("");
            out.add(Ansi.yellow("输入 eat <编号> 消费（约20分钟）"));
            return;
        }
        GameConfig.FoodDef food = resolveFood(gs, args[0], pool);
        if (food == null) {
            out.add(Ansi.red("没有这个选项，输入 eat 看看有什么。"));
            return;
        }
        if (s.character.money < food.cost) {
            out.add(Ansi.red("钱不够……（还差 " + (food.cost - s.character.money) + " 元）"));
            return;
        }
        if (s.character.hunger >= 100) {
            out.add(Ansi.yellow("你撑得走不动路了，先消化消化吧。"));
            return;
        }
        s.character.money -= food.cost;
        gs.changeHunger(food.hunger);
        gs.changeStamina(food.stamina);
        gs.changeMood(food.mood);
        gs.advanceTime(20);
        String verb = switch (s.locationId) {
            case "flower" -> "你买了一束";
            case "bar" -> "你点了一杯";
            case "billiards" -> "你体验了";
            case "club" -> "你享用了";
            default -> "你吃了份";
        };
        out.add(Ansi.cyan("🍽️ " + verb + food.name + "（" + food.cost + "元）"));
        out.add(Ansi.gray("　" + food.desc));
        out.add(Ansi.green("　饱腹 +" + food.hunger + (food.stamina > 0 ? "，体力 +" + food.stamina : "")
                + (food.stamina < 0 ? "，体力 " + food.stamina : "")
                + (food.mood > 0 ? "，心情 +" + food.mood : "")
                + (food.prestige > 0 ? "，声望 +" + food.prestige : "")));
        if (food.prestige > 0) {
            s.character.prestige += food.prestige;
        }
        // 消费后与店主互动（花店/酒吧/台球厅/会所/大街/美食街/商场）
        gs.shopNpcInteract(out, s.locationId, food.name);
        // 路边摊有概率吃坏肚子（地沟油风险）
        if ("street".equals(food.place) && gs.rnd().nextInt(100) < 6 && !s.sick) {
            s.sick = true;
            s.sickName = "肠胃炎";
            s.sickTick = 0;
            gs.changeMood(-8);
            gs.pushEvent(Ansi.red("🤢 吃完「" + food.name + "」你的肚子开始翻江倒海……得了肠胃炎！去商场买药（buy medicine）"));
            out.add(Ansi.red("🤢 吃完没多久，你的肚子开始翻江倒海……得了肠胃炎（去商场 buy medicine 买药）"));
        }
        if (s.character.hunger < 30) {
            out.add(Ansi.red("　还是好饿……"));
        }
    }

    /** 刷手机：需先买手机，+心情、随机看新闻 */
    public static void phone(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!s.inventory.contains("phone") && !s.inventory.contains("phone_smart")) {
            out.add(Ansi.yellow("你还没有手机。去商场（move 商场）买一部手机（buy 9 智能手机 或 buy 13 二手智能手机），就能刷手机了。"));
            return;
        }
        gs.advanceTime(10);
        int mood = 3 + gs.rnd().nextInt(6);
        gs.changeMood(mood);
        String[] posts = new String[]{
                "刷到朋友圈：老周发了张工地进度照「又干完一层，踏实！」",
                "看到本地新闻：临江地铁三号线开建，沿线餐饮店生意火爆。",
                "短视频刷到翠花家的摊位，评论区都在夸那碗牛肉面分量足。",
                "朋友发来消息：「刘哥说科技园那边招人，你考虑不？」",
                "刷到一只橘猫的视频，跟大黄长得一模一样，你笑了半天。",
                "本地热搜：#打工人下班吃什么# 你顺手点了收藏。"};
        String post = posts[gs.rnd().nextInt(posts.length)];
        out.add(Ansi.cyan("📱 你掏出手机刷了 10 分钟。"));
        out.add(Ansi.gray("　" + post));
        // 有手机时能看到股市行情小贴士
        if (!s.market.isEmpty()) {
            GameState.StockQuote q = s.market.get(gs.rnd().nextInt(s.market.size()));
            double chg = q.dayChangePct();
            String c = chg >= 0 ? Ansi.red(String.format("%+.2f%%", chg)) : Ansi.green(String.format("%.2f%%", chg));
            out.add(Ansi.gray("　财经推送：「" + q.name + "」现价 " + String.format("%.2f", q.price) + " 元，" + c + "（stock 可交易）"));
        }
        out.add(Ansi.green("　心情 +" + mood));
    }

    public static void sleep(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        boolean ownHome = !s.ownedEstates.isEmpty();
        GameConfig.HousingDef h = ownHome ? null : gs.cfg().housing.stream()
                .filter(x -> x.id.equals(s.housingId)).findFirst().orElse(null);

        int restore; int mood; double risk; String name; int cost = 0;
        if (ownHome) {
            restore = 100; mood = 10; risk = 0; name = "自己家";
        } else if (h != null) {
            restore = h.restore; mood = h.mood; risk = h.risk; name = h.name;
            if (h.leaseCost > 0) {
                if (s.leaseDays <= 0) {
                    s.housingId = "street";
                    out.add(Ansi.red("你的" + h.name + "租期已到，被房东赶了出来，只能睡大街。"));
                    h = gs.cfg().housing.stream().filter(x -> x.id.equals("street")).findFirst().orElse(null);
                    restore = h.restore; mood = h.mood; risk = h.risk; name = h.name;
                } else {
                    s.leaseDays--;
                }
            } else if (h.costPerNight > 0) {
                if (s.character.money < h.costPerNight) {
                    out.add(Ansi.red("连 " + h.costPerNight + " 元的住宿费都付不起了，只能睡大街。"));
                    h = gs.cfg().housing.stream().filter(x -> x.id.equals("street")).findFirst().orElse(null);
                    restore = h.restore; mood = h.mood; risk = h.risk; name = h.name;
                } else {
                    cost = h.costPerNight;
                    s.character.money -= cost;
                }
            }
        } else {
            restore = 40; mood = -15; risk = 0.2; name = "睡大街";
        }

        // 睡觉 8 小时
        gs.advanceTime(480);
        s.character.stamina = Math.min(100, Math.max(s.character.stamina, restore));
        int homeBonus = ownHome ? HomeActions.homeMoodBonus(gs) : 0;
        gs.changeMood(mood + homeBonus);

        out.add(Ansi.banner("夜深了", name + " · 睡了8小时"));
        out.add(Ansi.gray("　你躺在" + (ownHome ? "自己家的床上" : name + "（" + (cost > 0 ? cost + "元" : "免费") + "）") + "，沉沉睡去。"));
        out.add(Ansi.green("　🌙 体力恢复到 " + s.character.stamina + "/100" + (mood != 0 ? "，心情" + (mood > 0 ? "+" : "") + mood : "")));

        if (risk > 0 && gs.rnd().nextDouble() < risk) {
            if (gs.rnd().nextBoolean()) {
                int lost = 50 + gs.rnd().nextInt(100);
                s.character.money -= lost;
                gs.changeMood(-10);
                out.add(Ansi.red("　⚠ 半夜被小偷偷走 " + lost + " 元！"));
            } else if (!s.sick) {
                s.sick = true;
                s.sickName = "重感冒";
                s.sickTick = 0;
                gs.changeMood(-10);
                gs.pushEvent(Ansi.red("🤧 夜风刺骨，你着凉得了重感冒！去商场买药（buy medicine）"));
                out.add(Ansi.red("　🤧 夜风刺骨，你着凉得了重感冒！病中体力恢复打折，去商场 buy medicine 买药"));
            }
        }
        // 生病时睡眠恢复减半
        if (s.sick) {
            s.character.stamina = Math.max(0, s.character.stamina - 20);
            out.add(Ansi.yellow("　🤒 生病让你一夜没睡好，体力额外 -20（快去商场买药！）"));
        }
        if (s.character.hunger < 20) {
            out.add(Ansi.red("　饿着肚子睡，半夜被饿醒了……"));
        }
    }

    public static void housing(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) {
            out.add(Ansi.banner("住处选择", "HOUSING"));
            GameConfig.HousingDef cur = gs.cfg().housing.stream()
                    .filter(x -> x.id.equals(s.housingId)).findFirst().orElse(null);
            out.add(Ansi.gray("　当前：" + (cur != null ? cur.name : "睡大街")
                    + (s.leaseDays > 0 ? "（租期剩" + s.leaseDays + "天）" : "")));
            out.add("");
            List<GameConfig.HousingDef> list = gs.cfg().housing;
            for (int i = 0; i < list.size(); i++) {
                GameConfig.HousingDef h = list.get(i);
                String price;
                if (h.leaseCost > 0) price = "月租" + h.leaseCost + "元/" + h.leaseDays + "天";
                else if (h.costPerNight > 0) price = h.costPerNight + "元/晚";
                else price = "免费";
                out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(h.name)
                        + Ansi.gray("  " + price + "｜恢复体力至" + h.restore + "%"
                        + (h.mood != 0 ? " 心情" + (h.mood > 0 ? "+" : "") + h.mood : "")
                        + (h.risk > 0 ? " ⚠有风险" : "")));
                out.add(Ansi.darkGray("　　" + h.desc));
            }
            out.add("");
            out.add(Ansi.yellow("输入 housing <编号> 入住（如 housing 5），然后 sleep 睡觉"));
            return;
        }
        int idx = GameService.parseInt(args[0], -1);
        GameConfig.HousingDef h;
        if (idx >= 1 && idx <= gs.cfg().housing.size()) h = gs.cfg().housing.get(idx - 1);
        else h = gs.cfg().housing.stream().filter(x -> x.id.equals(args[0])).findFirst().orElse(null);
        if (h == null) {
            out.add(Ansi.red("没有这个住处，输入 housing 查看。"));
            return;
        }
        if (h.leaseCost > 0) {
            if (s.character.money < h.leaseCost) {
                out.add(Ansi.red("钱不够付房租（需 " + h.leaseCost + " 元），先攒钱吧。"));
                return;
            }
            s.character.money -= h.leaseCost;
            s.housingId = h.id;
            s.leaseDays = h.leaseDays;
            out.add(Ansi.green("🏠 租下了「" + h.name + "」，付了 " + h.leaseCost + " 元，" + h.leaseDays + " 天内随便住。"));
            gs.changeMood(h.mood);
        } else if (h.costPerNight > 0) {
            s.housingId = h.id;
            s.leaseDays = 0;
            out.add(Ansi.cyan("你选了「" + h.name + "」，每晚 " + h.costPerNight + " 元，睡觉时自动扣费。"));
        } else {
            s.housingId = h.id;
            s.leaseDays = 0;
            out.add(Ansi.gray("你决定「" + h.name + "」，免费的代价是风险与体面。"));
        }
    }

    private static GameConfig.FoodDef resolveFood(GameService gs, String arg, List<GameConfig.FoodDef> pool) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= pool.size()) return pool.get(idx - 1);
        return pool.stream().filter(f -> f.id.equals(arg)).findFirst().orElse(null);
    }

    // ============ 属性提升：锻炼 / 读书 / 祈福 / 行善 ============

    /** 锻炼：花 30 分钟，每 2 天 +1 体力 */
    public static void exercise(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("去大街找个空地就能练（move 大街）。"));
            return;
        }
        gs.advanceTime(30);
        gs.changeStamina(-8);
        gs.changeHunger(-3);
        gs.changeMood(3);
        if (s.lastExerciseDay < 0 || s.day() - s.lastExerciseDay >= 2) {
            if (s.character.str < 90) {
                s.lastExerciseDay = s.day();
                s.character.str++;
                out.add(Ansi.cyan("🏃 你在街角空地跑了半小时步，出了一身汗。"));
                out.add(Ansi.green("　💪 体格更结实了：体力(力量) +1（当前 " + s.character.str + "）"));
            } else {
                out.add(Ansi.gray("🏃 你跑了半小时步，身体已经练到头了。"));
            }
        } else {
            out.add(Ansi.cyan("🏃 你跑了半小时步，出了一身汗（刚练过，隔两天再来更有效）。"));
        }
    }

    /** 读书：花 60 分钟，每 2 天 +1 智力 */
    public static void readBook(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"home".equals(s.locationId) && !"training".equals(s.locationId)) {
            out.add(Ansi.red("回住处或培训中心安安静静看会儿书（move 住处 / move 培训中心）。"));
            return;
        }
        gs.advanceTime(60);
        gs.changeStamina(-2);
        gs.changeMood(2);
        if (s.lastReadDay < 0 || s.day() - s.lastReadDay >= 2) {
            if (s.character.intel < 90) {
                s.lastReadDay = s.day();
                s.character.intel++;
                out.add(Ansi.cyan("📚 你啃了一小时《城市生存指南》，越看越通透。"));
                out.add(Ansi.green("　🧠 脑子转得更快了：智力 +1（当前 " + s.character.intel + "）"));
            } else {
                out.add(Ansi.gray("📚 你翻了一小时书，学无可学了。"));
            }
        } else {
            out.add(Ansi.cyan("📚 你看了一小时书，心静了不少（刚学过，隔两天再读更有效）。"));
        }
    }

    /** 祈福：花 50 元香火钱，每 3 天 +1 运气 */
    public static void pray(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"flower".equals(s.locationId)) {
            out.add(Ansi.red("花店旁的小庙香火最灵（move 花店）。"));
            return;
        }
        if (s.character.money < 50) {
            out.add(Ansi.red("香火钱 50 元，口袋空空可不行。"));
            return;
        }
        s.character.money -= 50;
        gs.advanceTime(30);
        gs.changeMood(3);
        if (s.lastPrayDay < 0 || s.day() - s.lastPrayDay >= 3) {
            if (s.character.luck < 90) {
                s.lastPrayDay = s.day();
                s.character.luck++;
                out.add(Ansi.cyan("🙏 你上了三炷香，诚心拜了拜，心里踏实多了。"));
                out.add(Ansi.green("　🍀 运气好像真的变好了：运气 +1（当前 " + s.character.luck + "）"));
            } else {
                out.add(Ansi.gray("🙏 你拜了拜，香火钱没白花。"));
            }
        } else {
            out.add(Ansi.cyan("🙏 你上了香（心诚则灵，隔三天再来更灵验）。"));
        }
    }

    /** 行善：捐 100 元，每 2 天 +1 运气 + 声望 */
    public static void donate(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("去大街找红十字募捐箱（move 大街）。"));
            return;
        }
        if (s.character.money < 100) {
            out.add(Ansi.red("行善要 100 元，先攒攒钱。"));
            return;
        }
        s.character.money -= 100;
        gs.advanceTime(20);
        gs.changePrestige(3);
        gs.changeMood(5);
        if (s.lastDonateDay < 0 || s.day() - s.lastDonateDay >= 2) {
            if (s.character.luck < 90) {
                s.lastDonateDay = s.day();
                s.character.luck++;
                out.add(Ansi.cyan("💝 你把 100 元投进募捐箱，帮助了一个素不相识的人。"));
                out.add(Ansi.green("　🌱 好人有好报：运气 +1，声望 +3（当前运气 " + s.character.luck + "）"));
            } else {
                out.add(Ansi.gray("💝 你捐了 100 元，心情舒畅。"));
            }
        } else {
            out.add(Ansi.cyan("💝 你捐了 100 元（刚捐过，隔两天再捐更有意义）。"));
        }
    }
    /** 冥想：公园打坐，每 2 天 +1 智力，心情+6 */
    public static void meditate(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) {
            out.add(Ansi.red("公园里才有清净角落（move 城市公园）。"));
            return;
        }
        gs.advanceTime(30);
        gs.changeMood(6);
        if (s.lastMeditateDay < 0 || s.day() - s.lastMeditateDay >= 2) {
            if (s.character.intel < 90) {
                s.lastMeditateDay = s.day();
                s.character.intel++;
                out.add(Ansi.cyan("🧘 你在公园老树下打坐冥想半小时，心神澄澈。"));
                out.add(Ansi.green("　🧠 悟性提升：智力 +1（当前 " + s.character.intel + "），心情 +6"));
            } else {
                out.add(Ansi.gray("🧘 你打坐冥想半小时，头脑已经练到极限了。"));
            }
        } else {
            out.add(Ansi.gray("🧘 你打坐冥想半小时，心静了不少（刚冥想过，隔两天效果更好）。"));
        }
    }

    /** SPA：会所按摩放松，花钱买体力与心情 */
    public static void spa(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"club".equals(s.locationId)) {
            out.add(Ansi.red("会所才有专业按摩（move 会所）。"));
            return;
        }
        if (s.character.money < 80) {
            out.add(Ansi.red("会所 SPA 一次 80 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 80;
        gs.advanceTime(60);
        gs.changeStamina(18);
        gs.changeMood(12);
        out.add(Ansi.cyan("💆 你在会所做了个全身 SPA，筋骨舒展，疲惫一扫而空。"));
        out.add(Ansi.green("　体力 +18，心情 +12（花掉 80 元）"));
    }

    /** 台球练球：找手感，每 3 天 +1 运气 */
    public static void practice(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"billiards".equals(s.locationId)) {
            out.add(Ansi.red("台球厅才有球桌（move 台球厅）。"));
            return;
        }
        if (s.character.money < 15) {
            out.add(Ansi.red("练球台费 15 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 15;
        gs.advanceTime(30);
        gs.changeStamina(-5);
        gs.changeMood(4);
        if (s.lastPracticeDay < 0 || s.day() - s.lastPracticeDay >= 3) {
            if (s.character.luck < 90) {
                s.lastPracticeDay = s.day();
                s.character.luck++;
                out.add(Ansi.cyan("🎱 你在台球厅练了一小时，手感越来越顺。"));
                out.add(Ansi.green("　🍀 手感玄学：运气 +1（当前 " + s.character.luck + "），心情 +4"));
            } else {
                out.add(Ansi.gray("🎱 你练了一小时球，运气已经到顶了。"));
            }
        } else {
            out.add(Ansi.gray("🎱 你练了一小时球，手感还行（刚练过，隔三天再来更灵）。"));
        }
    }

    /** 拜财神：彩票店上香，每 3 天 +1 运气 */
    public static void worship(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"lottery".equals(s.locationId)) {
            out.add(Ansi.red("彩票店角落供着财神爷（move 彩票店）。"));
            return;
        }
        if (s.character.money < 30) {
            out.add(Ansi.red("香火钱 30 元（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= 30;
        gs.advanceTime(10);
        gs.changeMood(3);
        if (s.lastWorshipDay < 0 || s.day() - s.lastWorshipDay >= 3) {
            if (s.character.luck < 90) {
                s.lastWorshipDay = s.day();
                s.character.luck++;
                out.add(Ansi.cyan("🪔 你给财神爷上了三炷香，虔诚地拜了拜。"));
                out.add(Ansi.green("　🙏 财神庇佑：运气 +1（当前 " + s.character.luck + "），心情 +3"));
            } else {
                out.add(Ansi.gray("🪔 你拜了拜财神，运气已经到顶了。"));
            }
        } else {
            out.add(Ansi.gray("🪔 你拜了拜财神爷（刚拜过，隔三天再来更灵）。"));
        }
    }
}

