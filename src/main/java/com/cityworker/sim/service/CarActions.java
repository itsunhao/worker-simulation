package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.Comparator;
import java.util.List;

/**
 * v2.2 车辆互动系统：买车不再是摆设——
 * 兜风 / 洗车 / 加油 / 开黑车拉客 / 带熟人兜风 / 深夜飙车。
 * 车分三档（按价格）：basic（<1万）、normal（1万-10万）、lux（>10万），档位越高收益与排面越大。
 */
public final class CarActions {

    private CarActions() {}

    /** 当前最佳车辆 */
    public static GameConfig.CarDef bestCar(GameService gs) {
        GameState s = gs.state();
        if (s.ownedCars.isEmpty()) return null;
        return s.ownedCars.stream()
                .map(id -> gs.cfg().cars.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null))
                .filter(c -> c != null)
                .max(Comparator.comparingInt(c -> c.cost))
                .orElse(null);
    }

    private static int tier(GameConfig.CarDef c) {
        if (c.cost >= 100000) return 2;
        if (c.cost >= 10000) return 1;
        return 0;
    }

    private static String tierName(GameConfig.CarDef c) {
        if (tier(c) == 2) return "豪车";
        if (tier(c) == 1) return "代步车";
        return "小破车";
    }

    private static int fuelCost(GameConfig.CarDef c) {
        if (tier(c) == 2) return 60;
        if (tier(c) == 1) return 25;
        return 10;
    }

    public static void car(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length == 0) {
            GameConfig.CarDef best = bestCar(gs);
            if (best == null) {
                out.add(Ansi.gray("🚗 你还没有车。去 4S 店（move 4S店）看看，买一台属于自己的座驾（buycar）。"));
                return;
            }
            out.add(Ansi.banner("🚗 车库", "MY CARS"));
            for (String id : s.ownedCars) {
                GameConfig.CarDef c = gs.cfg().cars.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
                if (c == null) continue;
                String mark = id.equals(best.id) ? "★ " : "　";
                String line = Ansi.cyan("　" + mark + c.name) + Ansi.gray("　" + c.cost + "元购入 · 档位：" + tierName(c));
                out.add(line);
            }
            out.add("");
            out.add(Ansi.yellow("互动指令："));
            out.add(Ansi.gray("　car drive 　　兜风散心（心情大涨，花点油钱）"));
            out.add(Ansi.gray("　car wash 　　 洗车（保持体面，声望+）"));
            out.add(Ansi.gray("　car fuel 　　 加油（黑车拉客前先加满）"));
            out.add(Ansi.gray("　car taxi 　　 开黑车拉客（赚钱，耗体力，有风险）"));
            out.add(Ansi.gray("　car ride <编号> 载熟人兜风（增进感情）"));
            out.add(Ansi.gray("　car race 　　 深夜飙车（押注搏一把，跑车才够格）"));
            out.add(Ansi.gray("　car sell <编号> 卖车（去4S店）"));
            return;
        }
        String act = args[0].toLowerCase();
        if ("drive".equals(act)) drive(gs, out, args);
        else if ("wash".equals(act)) wash(gs, out, args);
        else if ("fuel".equals(act)) fuel(gs, out, args);
        else if ("taxi".equals(act)) taxi(gs, out, args);
        else if ("ride".equals(act)) ride(gs, out, args);
        else if ("race".equals(act)) race(gs, out, args);
        else if ("sell".equals(act)) sell(gs, out, args);
        else out.add(Ansi.yellow("用法：car [drive|wash|fuel|taxi|ride <编号>|race|sell <编号>]"));
    }

    // ============ 兜风 ============

    private static void drive(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("你还没有车，先 buycar 吧。"));
            return;
        }
        int fuel = fuelCost(c);
        if (s.character.money < fuel) {
            out.add(Ansi.red("油钱都掏不起了（" + fuel + "元），先去打工吧。"));
            return;
        }
        s.character.money -= fuel;
        gs.advanceTime(30);
        int moodGain = 6;
        if (tier(c) == 2) moodGain = 15;
        else if (tier(c) == 1) moodGain = 10;
        gs.changeMood(moodGain);
        s.carDriveCount++;
        String line;
        if (tier(c) == 2) line = "油门一踩，发动机的轰鸣让整条街都看向你。江边的风把烦恼都吹散了。";
        else if (tier(c) == 1) line = "你摇下车窗，吹着晚风沿江开了一圈，堵车的烦躁都顺了。";
        else line = "小电驴/小破车突突地跑着，风从领口灌进来，倒也自在。";
        out.add(Ansi.cyan("🚗 你开着" + c.name + "去兜了一圈（油费" + fuel + "元）。"));
        out.add(Ansi.gray("　" + line));
        out.add(Ansi.green("　心情+" + moodGain + "，用车次数 " + s.carDriveCount));
    }

    // ============ 洗车 ============

    private static void wash(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("你还没有车，先 buycar 吧。"));
            return;
        }
        int cost = 15;
        int pres = 1;
        if (tier(c) == 2) { cost = 100; pres = 3; }
        else if (tier(c) == 1) { cost = 40; pres = 2; }
        if (s.character.money < cost) {
            out.add(Ansi.red("洗车要 " + cost + " 元，再穷不能脏着开。"));
            return;
        }
        s.character.money -= cost;
        gs.advanceTime(20);
        gs.changePrestige(pres);
        gs.changeMood(2);
        out.add(Ansi.cyan("💧 你给" + c.name + "洗了个澡（" + cost + "元），锃光瓦亮。"));
        out.add(Ansi.green("　声望+" + pres + "，心情+2"));
    }

    // ============ 加油 ============

    private static void fuel(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("你还没有车。"));
            return;
        }
        if (tier(c) == 0) {
            out.add(Ansi.gray("　小电驴充电 5 元搞定，充满啦。"));
            return;
        }
        int cost = fuelCost(c) * 3;
        if (s.character.money < cost) {
            out.add(Ansi.red("加满要 " + cost + " 元，油表都见底了。"));
            return;
        }
        s.character.money -= cost;
        gs.advanceTime(15);
        out.add(Ansi.cyan("⛽ 你给" + c.name + "加满了油（" + cost + "元）。"));
        out.add(Ansi.gray("　油箱满格，跑车拉客心里有底了。"));
    }

    // ============ 黑车拉客 ============

    private static void taxi(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("开黑车得有辆车，先 buycar 吧。"));
            return;
        }
        if (tier(c) == 0 && !"tricycle".equals(c.id)) {
            out.add(Ansi.red("小电驴拉客会被交警教育，三轮/面包车起才像话。"));
            return;
        }
        if (s.character.stamina < 18) {
            out.add(Ansi.red("你太累了，拉不了车。先睡一觉吧。"));
            return;
        }
        gs.advanceTime(120);
        gs.changeStamina(-18);
        int base = 40;
        if (tier(c) == 2) base = 150;
        else if (tier(c) == 1) base = 80;
        int earn = base + gs.rnd().nextInt(base) + (int) (gs.state().character.luck * 2);
        // 6% 概率被查
        if (gs.rnd().nextDouble() < 0.06) {
            int fine = 100 + gs.rnd().nextInt(200);
            s.character.money -= fine;
            out.add(Ansi.red("🚓 你拉客时被运管查了！罚款 " + fine + " 元，血本无归。"));
            out.add(Ansi.gray("　下次换个时间段，或者少跑两趟。"));
            gs.pushEvent(Ansi.red("🚓 开黑车被查，罚款 " + fine + " 元"));
            return;
        }
        s.character.money += earn;
        s.carTaxiEarn += earn;
        out.add(Ansi.cyan("🚕 你开着" + c.name + "拉了两小时黑车。"));
        int pick = gs.rnd().nextInt(4);
        String line;
        if (pick == 0) line = "碰上个话痨乘客，一路从油价聊到房价。";
        else if (pick == 1) line = "几个赶火车的年轻人包了你的车，给了不少小费。";
        else if (pick == 2) line = "夜归的白领叫了你的车，下车时还道了声谢。";
        else line = "火车站门口排了一队，你连跑三单。";
        out.add(Ansi.gray("　" + line));
        out.add(Ansi.green("　💰 进账 " + earn + " 元（累计黑车收入 " + s.carTaxiEarn + " 元），体力-18"));
    }

    // ============ 载熟人兜风 ============

    private static void ride(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("你还没有车。"));
            return;
        }
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：car ride <编号>，先 social 看看你的熟人。"));
            return;
        }
        NPC n = SocialActions.resolve(gs, args, out);
        if (n == null) return;
        if (n.affection < 20) {
            out.add(Ansi.gray("　" + n.name + "跟你还不熟，不好意思上你的车。"));
            return;
        }
        gs.advanceTime(30);
        gs.changeMood(4);
        int gain = 8 + tier(c) * 4;
        SocialActions.gainAffection(gs, n, gain);
        n.lastInteractDay = s.day();
        String line;
        if (tier(c) == 2) line = n.name + "坐进你的车，摸了摸内饰：「这车不便宜吧？」眼里全是惊喜。";
        else if (tier(c) == 1) line = "你载着" + n.name + "沿江兜了一圈，她/他看着夜景发了会儿呆。";
        else line = "你载着" + n.name + "突突地穿过小巷，风吹得她/他直眯眼，却笑得很开心。";
        out.add(Ansi.cyan("🚘 你开着" + c.name + "载" + n.name + "兜风。"));
        out.add(Ansi.gray("　" + line));
        out.add(Ansi.green("　「" + n.name + "」好感 +" + gain + "（当前 " + n.affection + "/100），心情+4"));
    }

    // ============ 深夜飙车 ============

    private static void race(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        GameConfig.CarDef c = bestCar(gs);
        if (c == null) {
            out.add(Ansi.red("你还没有车。"));
            return;
        }
        if (tier(c) < 1) {
            out.add(Ansi.red("飙车至少得是辆正经车（摩托车/面包车起），小电驴上赛道是送命。"));
            return;
        }
        int bet = args.length > 1 ? GameService.parseInt(args[1], 0) : 0;
        if (bet < 100) bet = 100;
        if (s.character.money < bet) {
            out.add(Ansi.red("押注至少 100 元，你手头不够。"));
            return;
        }
        s.character.money -= bet;
        gs.advanceTime(30);
        gs.changeStamina(-10);
        s.carRaceCount++;
        out.add(Ansi.yellow("🏁 深夜的环城路，你开着" + c.name + "停在了起跑线。押注 " + bet + " 元。"));
        // 胜率：车档位 + 幸运
        double winRate = 0.3 + tier(c) * 0.2 + s.character.luck * 0.006;
        if (winRate > 0.85) winRate = 0.85;
        if (gs.rnd().nextDouble() < winRate) {
            int prize = (int) (bet * (1.2 + gs.rnd().nextDouble() * 1.5));
            s.character.money += bet + prize;
            int pres = tier(c) == 2 ? 5 : 3;
            gs.changePrestige(pres);
            gs.changeMood(8);
            out.add(Ansi.gold("🏆 你赢了！甩开对手两个车身冲过终点线！"));
            out.add(Ansi.green("　💰 拿回 " + bet + " 本金 + 奖金 " + prize + " 元，声望+" + pres + "，心情+8"));
        } else {
            gs.changeMood(-5);
            out.add(Ansi.red("💥 你输了……弯道没稳住，被对手超了三个身位。"));
            out.add(Ansi.gray("　押注 " + bet + " 元打了水漂，心情-5。"));
        }
        gs.pushEvent(Ansi.cyan("🏁 深夜飙车第 " + s.carRaceCount + " 场（押注" + bet + "元）"));
    }

    // ============ 卖车 ============

    private static void sell(GameService gs, List<String> out, String[] args) {
        ShopActions.sellCar(gs, out, args);
    }
}
