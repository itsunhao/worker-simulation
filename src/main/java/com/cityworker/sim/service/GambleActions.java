package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/** 娱乐系统：刮刮乐 / 双色球彩票 */
public final class GambleActions {

    private GambleActions() {}

    public static void scratch(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"lottery".equals(s.locationId)) {
            out.add(Ansi.red("刮刮乐要去「好运来彩票站」（move 彩票店）"));
            return;
        }
        GameConfig.ScratchDef sc = gs.cfg().scratch;
        // 一次只能刮 1 张（高仿真 UI 单张票面）
        int totalCost = sc.cost;
        if (s.character.money < totalCost) {
            out.add(Ansi.red("钱不够买 1 张刮刮乐（需 " + totalCost + " 元，差 " + (totalCost - s.character.money) + " 元）。"));
            return;
        }
        s.character.money -= totalCost;
        gs.advanceTime(5);

        out.add(Ansi.banner("刮刮乐", "每张" + sc.cost + "元 · 头奖" + sc.jackpotMax + "元"));
        int prize = rollScratch(gs, sc, s.character.luck);
        if (prize == 0) {
            out.add(Ansi.gray("　谢谢惠顾，再接再厉"));
        } else if (prize >= 100000) {
            out.add(Ansi.gold("🌟 惊！大奖降临！！+" + prize + " 元！！！"));
            gs.pushEvent(Ansi.gold("🌟 刮刮乐大奖：+" + prize + " 元！"));
        } else if (prize >= 1000) {
            out.add(Ansi.gold("🎉 中大奖了！+" + prize + " 元！！"));
            gs.pushEvent(Ansi.gold("🎉 刮刮乐大奖：+" + prize + " 元"));
        } else if (prize >= 100) {
            out.add(Ansi.green("✨ 中奖！+" + prize + " 元"));
        } else {
            out.add(Ansi.cyan("　中了 " + prize + " 元，回了一点血"));
        }
        s.character.money += prize;
        if (s.character.money < 0) {
            s.character.money = 0;
            out.add(Ansi.red("　⚠ 你刮红了眼，把最后的钱也搭了进去……"));
        }
        out.add("");
        out.add(Ansi.gold("💰 余额：" + s.character.money + " 元"));
    }

    public static void lottery(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"lottery".equals(s.locationId)) {
            out.add(Ansi.red("双色球要去「好运来彩票站」（move 彩票店）"));
            return;
        }
        GameConfig.LotteryDef ld = gs.cfg().lottery;
        if (args.length == 0) {
            out.add(Ansi.banner("双色球", "每注" + ld.costPerTicket + "元"));
            out.add(Ansi.gray("　红球6个(1-33) + 蓝球1个(1-16)，每日 " + String.format("%02d:%02d", ld.drawHour, ld.drawMinute) + " 自动开奖。"));
            out.add(Ansi.gray("　头奖 500 万！打工十年不如一注翻身。"));
            out.add(Ansi.gray("　当前持有待开奖注数：" + s.lotteryPending + " 注"));
            out.add("");
            out.add(Ansi.yellow("　用法：lottery buy <注数>（如 lottery buy 5）"));
            out.add(Ansi.gray("　示例奖金：6+1 → 500万；6+0 → 50万；5+1 → 3000；5+0/4+1 → 200；4+0/3+1 → 10"));
            return;
        }
        if ("buy".equals(args[0]) || "买".equals(args[0])) {
            int n = args.length > 1 ? GameService.parseInt(args[1], 1) : 1;
            n = Math.max(1, Math.min(200, n));
            int cost = ld.costPerTicket * n;
            if (s.character.money < cost) {
                out.add(Ansi.red("钱不够（需 " + cost + " 元）。"));
                return;
            }
            s.character.money -= cost;
            s.lotteryPending += n;
            gs.advanceTime(10);
            out.add(Ansi.green("🎫 买了 " + n + " 注双色球（" + cost + " 元），累计待开奖 " + s.lotteryPending + " 注。"));
            out.add(Ansi.gray("　今晚 " + String.format("%02d:%02d", ld.drawHour, ld.drawMinute) + " 自动开奖，祝你好运！"));
        } else {
            out.add(Ansi.yellow("用法：lottery buy <注数>"));
        }
    }

    /** 每日 21:30 自动开奖 */
    public static void draw(GameService gs) {
        GameState s = gs.state();
        GameConfig.LotteryDef ld = gs.cfg().lottery;
        int pending = s.lotteryPending;
        if (pending <= 0) return;
        s.lotteryPending = 0;

        List<Integer> winRed = pickRed(gs);
        int winBlue = 1 + gs.rnd().nextInt(16);
        gs.pushEvent(Ansi.gold("🎱 双色球开奖啦！红球 " + formatRed(winRed) + " + 蓝球 " + winBlue));
        int totalWin = 0;
        int bigWin = 0;
        int hitCount = 0;
        for (int i = 0; i < pending; i++) {
            List<Integer> myRed = pickRed(gs);
            int myBlue = 1 + gs.rnd().nextInt(16);
            int redMatch = 0;
            for (int r : myRed) if (winRed.contains(r)) redMatch++;
            boolean blueMatch = myBlue == winBlue;
            int prize = lookupPrize(ld, redMatch, blueMatch);
            if (prize > 0) {
                totalWin += prize;
                hitCount++;
                if (prize >= 500000) bigWin = Math.max(bigWin, prize);
            }
        }
        if (hitCount > 0) {
            gs.pushEvent(Ansi.green("💰 你买的 " + pending + " 注中，有 " + hitCount + " 注中奖，合计 +" + totalWin + " 元！"));
        } else {
            gs.pushEvent(Ansi.gray("🍋 你买的 " + pending + " 注都没中，下次一定！"));
        }
        if (bigWin > 0) {
            s.wonBigLottery = true;
            s.character.money += bigWin;
            gs.pushEvent(Ansi.gold("🏆 天哪！你中了 " + bigWin + " 元巨奖！！！从此改变了命运！"));
        } else {
            s.character.money += totalWin;
        }
        gs.changeMood(totalWin > 0 ? 5 : -3);
    }

    /**
     * 刮一张：
     * 1) 先按 jackpotChance（基础 30%，受运气微调）判定是否命中大奖池（≥1000 元，含 500 万头奖）；
     * 2) 未中大奖则按 winChance 走普通奖池（10~500 元）。
     * 返回 0 表示未中奖。
     */
    public static int rollScratch(GameService gs, GameConfig.ScratchDef sc, int luck) {
        double jackpotChance = Math.max(0.05, Math.min(0.9,
                (sc.jackpotChance > 0 ? sc.jackpotChance : 0.3) + (luck - 30) * 0.002));
        if (gs.rnd().nextDouble() < jackpotChance) {
            return pickPrize(gs, sc.jackpots != null && !sc.jackpots.isEmpty() ? sc.jackpots : sc.prizes);
        }
        double winChance = Math.max(0.15, Math.min(0.75, sc.winChance + (luck - 30) * 0.004));
        if (gs.rnd().nextDouble() < winChance) {
            return pickPrize(gs, sc.prizes);
        }
        return 0;
    }

    private static int pickPrize(GameService gs, List<GameConfig.ScratchPrize> prizes) {
        double total = prizes.stream().mapToDouble(p -> p.weight).sum();
        double roll = gs.rnd().nextDouble() * total;
        for (GameConfig.ScratchPrize p : prizes) {
            roll -= p.weight;
            if (roll < 0) return p.amount;
        }
        return prizes.get(0).amount;
    }

    private static List<Integer> pickRed(GameService gs) {
        TreeSet<Integer> set = new TreeSet<>();
        while (set.size() < 6) set.add(1 + gs.rnd().nextInt(33));
        return new ArrayList<>(set);
    }

    private static String formatRed(List<Integer> reds) {
        StringBuilder sb = new StringBuilder();
        for (int r : reds) sb.append(String.format("%02d ", r));
        return sb.toString().trim();
    }

    private static int lookupPrize(GameConfig.LotteryDef ld, int redMatch, boolean blueMatch) {
        int best = 0;
        for (GameConfig.LotteryPrize p : ld.prizes) {
            if (p.match == redMatch && p.plusBlue == blueMatch) {
                best = Math.max(best, p.amount);
            }
        }
        return best;
    }
}
