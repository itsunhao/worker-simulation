package com.cityworker.sim.service;

import com.cityworker.sim.model.BlackjackGame;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.GomokuGame;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.List;
import java.util.Random;

/**
 * 城市公园玩法：与棋友/牌友对赌 21 点与五子棋。
 * 命令：bj [下注] / bj hit / bj stand / bj double；gomoku [下注] / gomoku put <行> <列> / gomoku view
 * 前端弹窗通过 /api/game/bj 与 /api/game/gomoku 交互（GameApiController 转发）。
 */
public class ParkActions {

    private static final Random RND = new Random();

    /* ================ 21 点 ================ */

    public static String bj(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) {
            out.add(Ansi.red("公园里才有棋友和牌友（move 城市公园）"));
            return null;
        }
        BlackjackGame g = s.blackjack;
        if (g == null) { g = new BlackjackGame(); s.blackjack = g; }
        if (args.length == 0) {
            if (g.phase.equals("play")) {
                out.add(Ansi.gold("牌局进行中：你 " + scoreStr(g, false) + "，庄家明牌 " + g.dealer.get(0)));
                out.add(Ansi.yellow("输入 bj hit 要牌 / bj stand 停牌 / bj double 加倍"));
            } else {
                out.add(Ansi.gold("🎲 和公园牌友玩 21 点：输入 bj <下注金额> 开始（最少 10 元）"));
            }
            return null;
        }
        if (args[0].equalsIgnoreCase("hit") || args[0].equalsIgnoreCase("stand") || args[0].equalsIgnoreCase("double")) {
            return bjAction(gs, out, args[0].toLowerCase());
        }
        int bet = GameService.parseInt(args[0], 0);
        if (bet < 10) { out.add(Ansi.red("下注最少 10 元。玩法：bj <下注>")); return null; }
        if (s.character.money < bet) { out.add(Ansi.red("现金不够（当前 " + s.character.money + " 元）。")); return null; }
        if (g.phase.equals("play")) { out.add(Ansi.red("先把这局打完（bj hit / stand）。")); return null; }
        g.deck.clear(); g.player.clear(); g.dealer.clear();
        g.bet = bet; g.playerStand = false; g.phase = "play";
        g.player.add(g.draw()); g.player.add(g.draw());
        g.dealer.add(g.draw()); g.dealer.add(g.draw());
        if (BlackjackGame.score(g.player) == 21) {
            settleBj(gs, out, g, false);
        } else {
            out.add(Ansi.gold("🎲 发牌：你 " + scoreStr(g, false) + "，庄家明牌 " + g.dealer.get(0)
                    + "。输入 bj hit 要牌 / stand 停牌 / double 加倍（下注 " + g.bet + " 元）"));
        }
        return null;
    }

    private static String scoreStr(BlackjackGame g, boolean dealer) {
        List<String> hand = dealer ? g.dealer : g.player;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < hand.size(); i++) {
            if (dealer && i == 1 && !g.playerStand && !g.phase.equals("done")) { sb.append("🂠 "); continue; }
            sb.append(hand.get(i)).append(' ');
        }
        return sb.toString().trim() + "（" + BlackjackGame.score(hand) + "点）";
    }

    private static String bjAction(GameService gs, List<String> out, String action) {
        GameState s = gs.state();
        BlackjackGame g = s.blackjack;
        if (g == null || !g.phase.equals("play")) {
            out.add(Ansi.yellow("没有进行中的牌局，输入 bj <下注> 开始。"));
            return null;
        }
        if (action.equals("double")) {
            if (g.playerStand || g.player.size() > 2) { out.add(Ansi.red("只能刚发完牌时加倍。")); return null; }
            if (s.character.money < g.bet) { out.add(Ansi.red("现金不够加倍。")); return null; }
            g.bet *= 2;
            g.player.add(g.draw());
            out.add(Ansi.gold("💥 加倍！下注变 " + g.bet + " 元，补一张：你 " + scoreStr(g, false)));
            if (BlackjackGame.score(g.player) > 21) { settleBj(gs, out, g, true); return null; }
            g.playerStand = true;
        } else if (action.equals("hit")) {
            g.player.add(g.draw());
            out.add(Ansi.gold("🃏 要牌：你 " + scoreStr(g, false)));
            if (BlackjackGame.score(g.player) > 21) { settleBj(gs, out, g, true); return null; }
            if (BlackjackGame.score(g.player) == 21) g.playerStand = true;
        } else { // stand
            g.playerStand = true;
            out.add(Ansi.gold("🛑 停牌：你 " + scoreStr(g, false)));
        }
        if (!g.playerStand) {
            out.add(Ansi.yellow("继续 bj hit / stand。"));
            return null;
        }
        // 庄家回合
        out.add(Ansi.gold("庄家翻开：" + scoreStr(g, true)));
        while (BlackjackGame.score(g.dealer) < 17) {
            g.dealer.add(g.draw());
            out.add(Ansi.gold("庄家要牌：" + scoreStr(g, true)));
        }
        settleBj(gs, out, g, false);
        return null;
    }

    private static void settleBj(GameService gs, List<String> out, BlackjackGame g, boolean announce) {
        int ps = BlackjackGame.score(g.player), ds = BlackjackGame.score(g.dealer);
        int res;
        if (ps > 21) res = -1;
        else if (ds > 21 || ps > ds) res = 1;
        else if (ps == ds) res = 0;
        else res = -1;
        g.result = res; g.phase = "done";
        int gain;
        if (res > 0) { gain = g.bet; out.add(Ansi.green("🎉 你赢了！净赚 " + gain + " 元（你 " + ps + " 点，庄家 " + ds + " 点）")); }
        else if (res == 0) { gain = 0; out.add(Ansi.gray("🤝 平局，退回下注（你 " + ps + " 点，庄家 " + ds + " 点）")); }
        else { gain = -g.bet; out.add(Ansi.red("💸 爆了/输了！输掉 " + g.bet + " 元（你 " + ps + " 点，庄家 " + ds + " 点）")); }
        g.payout = gain;
        GameState s0 = gs.state();
        s0.character.money += gain;
        if (res > 0) {
            s0.parkBjWins++;
            NPC zhang = s0.npcs.stream().filter(n -> "cards".equals(n.role)).findFirst().orElse(null);
            if (zhang != null) {
                zhang.affection = Math.min(100, zhang.affection + 5);
                out.add(Ansi.pink("　张叔输得心服口服，好感 +5（" + zhang.affection + "/100）"));
            }
        } else if (res < 0) {
            gs.changeMood(-5);
            out.add(Ansi.gray("　输钱还丢了面子，心情 -5"));
        }
        if (gain != 0) gs.pushEvent("🎲 21点结算：" + (gain > 0 ? "+" : "") + gain + " 元");
    }

    /* ================ 五子棋 ================ */

    public static String gomoku(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) {
            out.add(Ansi.red("公园里才有棋友（move 城市公园）"));
            return null;
        }
        GomokuGame g = s.gomoku;
        if (g == null) { g = new GomokuGame(); s.gomoku = g; }
        if (args.length == 0) {
            if (g.phase.equals("play")) {
                out.add(Ansi.gold("对局进行中（下注 " + g.bet + " 元），输入 gomoku view 看棋盘，gomoku put <行> <列> 落子（1-15）"));
            } else {
                out.add(Ansi.gold("♟️ 和公园棋友下五子棋：输入 gomoku <下注金额> 开始（最少 10 元，你执黑先手）"));
            }
            return null;
        }
        if (args[0].equalsIgnoreCase("view")) {
            out.add("\n" + boardStr(g));
            return null;
        }
        if (args[0].equalsIgnoreCase("put")) {
            if (args.length < 3) { out.add(Ansi.yellow("用法：gomoku put <行> <列>")); return null; }
            int r = GameService.parseInt(args[1], -1), c = GameService.parseInt(args[2], -1);
            if (!g.inRange(r, c)) { out.add(Ansi.red("坐标要在 1-15 之间。")); return null; }
            if (!g.phase.equals("play")) { out.add(Ansi.red("没有进行中的对局，gomoku <下注> 开始。")); return null; }
            if (!g.playerTurn) { out.add(Ansi.red("轮到棋友落子，请稍等。")); return null; }
            if (g.board[r][c] != 0) { out.add(Ansi.red("这里已经有子了。")); return null; }
            g.board[r][c] = 1; g.moves++;
            if (g.hasFive(r, c, 1)) { settleGomoku(gs, out, g, 1); return null; }
            if (g.boardFull()) { settleGomoku(gs, out, g, 0); return null; }
            g.playerTurn = false;
            aiMove(g);
            if (g.phase.equals("done")) return null;
            if (g.boardFull()) { settleGomoku(gs, out, g, 0); return null; }
            g.playerTurn = true;
            out.add(Ansi.gold("你落子 (" + (r + 1) + "," + (c + 1) + ")，棋友应手。\n" + boardStr(g)));
            out.add(Ansi.yellow("继续 gomoku put <行> <列>"));
            return null;
        }
        int bet = GameService.parseInt(args[0], 0);
        if (bet < 10) { out.add(Ansi.red("下注最少 10 元。玩法：gomoku <下注>")); return null; }
        if (s.character.money < bet) { out.add(Ansi.red("现金不够（当前 " + s.character.money + " 元）。")); return null; }
        if (g.phase.equals("play")) { out.add(Ansi.red("先把这局下完。")); return null; }
        g.board = new int[15][15]; g.bet = bet; g.playerTurn = true; g.moves = 0;
        g.phase = "play"; g.result = 0; g.payout = 0;
        out.add(Ansi.gold("♟️ 对局开始！你执黑先手，下注 " + bet + " 元。输入 gomoku put <行> <列> 落子，或 gomoku view 看棋盘"));
        return null;
    }

    /** 简单 AI：能赢先赢，能挡先挡，其次中心/随机 */
    private static void aiMove(GomokuGame g) {
        int bestR = -1, bestC = -1, bestScore = Integer.MIN_VALUE;
        for (int r = 0; r < 15; r++) {
            for (int c = 0; c < 15; c++) {
                if (g.board[r][c] != 0) continue;
                int sc = 0;
                sc += evalPoint(g, r, c, 2) * 3;  // AI 进攻（连五优先）
                sc += evalPoint(g, r, c, 1);       // 防守玩家
                sc += (7 - Math.abs(r - 7)) + (7 - Math.abs(c - 7)); // 中心偏好
                if (sc > bestScore) { bestScore = sc; bestR = r; bestC = c; }
            }
        }
        g.board[bestR][bestC] = 2; g.moves++;
        if (g.hasFive(bestR, bestC, 2)) settleGomoku(g, 2);
    }

    /** 评估在 (r,c) 放 who 后四个方向的连子潜力 */
    private static int evalPoint(GomokuGame g, int r, int c, int who) {
        int total = 0;
        int[][] dirs = {{1, 0}, {0, 1}, {1, 1}, {1, -1}};
        for (int[] d : dirs) {
            int cnt = 1, open = 0;
            for (int s = 1; s <= 4; s++) {
                int nr = r + d[0] * s, nc = c + d[1] * s;
                if (!g.inRange(nr, nc)) break;
                if (g.board[nr][nc] == who) cnt++;
                else if (g.board[nr][nc] == 0) { open++; break; }
                else break;
            }
            for (int s = 1; s <= 4; s++) {
                int nr = r - d[0] * s, nc = c - d[1] * s;
                if (!g.inRange(nr, nc)) break;
                if (g.board[nr][nc] == who) cnt++;
                else if (g.board[nr][nc] == 0) { open++; break; }
                else break;
            }
            total += (cnt >= 5) ? 10000 : (cnt * cnt * 10 + open);
        }
        return total;
    }

    private static void settleGomoku(GameService gs, List<String> out, GomokuGame g, int winner) {
        int res = winner == 1 ? 1 : (winner == 0 ? 0 : -1);
        g.result = res; g.phase = "done";
        int gain = res > 0 ? g.bet : (res == 0 ? 0 : -g.bet);
        g.payout = gain;
        GameState s0 = gs.state();
        s0.character.money += gain;
        out.add("\n" + boardStr(g));
        if (res > 0) out.add(Ansi.green("🏆 五连珠！你赢了，净赚 " + gain + " 元"));
        else if (res == 0) out.add(Ansi.gray("🤝 棋盘下满，平局"));
        else out.add(Ansi.red("💸 棋友赢了，输掉 " + (-gain) + " 元"));
        if (res > 0) {
            s0.parkGomokuWins++;
            NPC li = s0.npcs.stream().filter(n -> "chess".equals(n.role)).findFirst().orElse(null);
            if (li != null) {
                li.affection = Math.min(100, li.affection + 5);
                out.add(Ansi.pink("　老李直拍大腿，好感 +5（" + li.affection + "/100）"));
            }
        } else if (res < 0) {
            gs.changeMood(-5);
            out.add(Ansi.gray("　输棋还被老李笑话，心情 -5"));
        }
        if (gain != 0) gs.pushEvent("♟️ 五子棋结算：" + (gain > 0 ? "+" : "") + gain + " 元");
    }

    private static void settleGomoku(GomokuGame g, int winner) {
        int res = winner == 2 ? -1 : 0;
        g.result = res; g.phase = "done";
        g.payout = res < 0 ? -g.bet : 0;
    }

    public static String boardStr(GomokuGame g) {
        StringBuilder sb = new StringBuilder();
        sb.append("   ");
        for (int c = 0; c < 15; c++) sb.append(String.format("%2d ", c + 1));
        sb.append("\n");
        for (int r = 0; r < 15; r++) {
            sb.append(String.format("%2d ", r + 1));
            for (int c = 0; c < 15; c++) {
                int v = g.board[r][c];
                sb.append(v == 1 ? " ● " : v == 2 ? " ○ " : " · ");
            }
            sb.append("\n");
        }
        return sb.toString();
    }
}
