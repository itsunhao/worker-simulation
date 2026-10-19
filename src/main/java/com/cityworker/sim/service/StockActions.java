package com.cityworker.sim.service;

import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 股市系统：行情 / 买卖 / 持仓 / 走势 */
public final class StockActions {

    private StockActions() {}

    public static GameState.StockQuote quote(GameService gs, String code) {
        return gs.state().market.stream().filter(q -> q.code.equalsIgnoreCase(code)).findFirst().orElse(null);
    }

    public static void stock(GameService gs, List<String> out, String[] args) {
        if (!"stock".equals(gs.state().locationId)) {
            out.add(Ansi.red("炒股得去交易大厅（move 交易大厅），那里有大屏和气氛"));
            return;
        }
        if (args.length >= 1 && "buy".equalsIgnoreCase(args[0])) { buy(gs, out, args); return; }
        if (args.length >= 1 && "sell".equalsIgnoreCase(args[0])) { sell(gs, out, args); return; }
        if (args.length >= 1 && "mine".equalsIgnoreCase(args[0])) { mine(gs, out); return; }
        if (args.length >= 1 && "chart".equalsIgnoreCase(args[0])) { chart(gs, out, args); return; }
        market(gs, out);
    }

    /** 行情总览 */
    public static void market(GameService gs, List<String> out) {
        GameState s = gs.state();
        out.add(Ansi.banner("临江证券交易所", "WORKER STOCK EXCHANGE"));
        out.add(Ansi.gray("　交易时间：每日 09:30-11:30 / 13:00-15:00 · 收盘价随城市脉搏跳动"));
        out.add("");
        out.add(Ansi.gray("　" + Ansi.bold("代码") + "   名称        行业   " + Ansi.bold("现价") + "     涨跌%"));
        for (GameState.StockQuote q : s.market) {
            double chg = q.dayChangePct();
            String chgStr = chg >= 0 ? "+" + String.format("%.2f", chg) : String.format("%.2f", chg);
            String colored = chg >= 0 ? Ansi.red(chgStr + "%") : Ansi.green(chgStr + "%");
            out.add(Ansi.cyan(" " + q.code) + "  " + Ansi.bold(q.name)
                    + Ansi.gray(" " + q.sector + " ") + Ansi.gold(String.format("%8.2f", q.price))
                    + "  " + colored + Ansi.gray("  " + q.icon));
        }
        out.add("");
        out.add(Ansi.gray("　说明：红涨绿跌，1手=100股。资金有风险，打工人需谨慎。"));
        out.add(Ansi.yellow("　　stock buy <代码> <股数> 买入｜stock sell <代码> <股数> 卖出｜stock mine 我的持仓"));
    }

    /** 买入 */
    public static void buy(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 3) {
            out.add(Ansi.yellow("用法：stock buy <代码> <股数>（1手=100股，如 stock buy WY01 100）"));
            return;
        }
        GameState.StockQuote q = quote(gs, args[1]);
        if (q == null) { out.add(Ansi.red("没有这个股票代码（stock 查看行情）。")); return; }
        int shares;
        try { shares = Integer.parseInt(args[2]); } catch (NumberFormatException e) {
            out.add(Ansi.red("股数要是整数。")); return;
        }
        if (shares <= 0 || shares % 100 != 0) { out.add(Ansi.red("股数须为 100 的整数倍（1手=100股）。")); return; }
        double amount = q.price * shares;
        if (s.character.money < amount) {
            out.add(Ansi.red("现金不够：需要 " + String.format("%.1f", amount) + " 元，你只有 " + s.character.money + " 元。"));
            return;
        }
        // 收取手续费（低额，仿真券商）
        double fee = Math.max(1, amount * 0.001);
        if (s.character.money < amount + fee) {
            out.add(Ansi.red("加上手续费 " + String.format("%.1f", fee) + " 元，现金不够。"));
            return;
        }
        s.character.money -= (int) Math.ceil(amount + fee);
        GameState.StockHolding h = s.holdings.stream().filter(x -> x.code.equalsIgnoreCase(q.code)).findFirst().orElse(null);
        if (h == null) {
            h = new GameState.StockHolding();
            h.code = q.code;
            h.shares = 0;
            h.totalCost = 0;
            s.holdings.add(h);
        }
        h.shares += shares;
        h.totalCost += amount + fee;
        out.add(Ansi.green("✔ 买入成交：") + Ansi.bold(q.name + " " + q.code) + " ×" + shares + "股"
                + Ansi.gray(" @ " + String.format("%.2f", q.price) + " 元，含手续费 " + String.format("%.1f", fee) + " 元，共支出 " + String.format("%.1f", amount + fee) + " 元"));
        gs.pushEvent(Ansi.cyan("📈 你在 " + q.name + " 上投入了 " + String.format("%.0f", amount) + " 元。"));
    }

    /** 卖出 */
    public static void sell(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 3) {
            out.add(Ansi.yellow("用法：stock sell <代码> <股数>（如 stock sell WY01 100）"));
            return;
        }
        GameState.StockQuote q = quote(gs, args[1]);
        if (q == null) { out.add(Ansi.red("没有这个股票代码。")); return; }
        int shares;
        try { shares = Integer.parseInt(args[2]); } catch (NumberFormatException e) {
            out.add(Ansi.red("股数要是整数。")); return;
        }
        GameState.StockHolding h = s.holdings.stream().filter(x -> x.code.equalsIgnoreCase(q.code)).findFirst().orElse(null);
        if (h == null || h.shares <= 0) { out.add(Ansi.red("你没有持有「" + q.name + "」。")); return; }
        if (shares <= 0 || shares > h.shares) {
            out.add(Ansi.red("股数须为 100 的整数倍且不超过持仓 " + h.shares + " 股。"));
            return;
        }
        double amount = q.price * shares;
        double fee = Math.max(1, amount * 0.001);
        s.character.money += (int) Math.floor(amount - fee);
        double avgCost = h.totalCost / h.shares;
        double pnl = (q.price - avgCost) * shares - fee;
        h.shares -= shares;
        h.totalCost -= avgCost * shares;
        if (h.shares <= 0) s.holdings.remove(h);
        String pnlStr = pnl >= 0 ? Ansi.red("盈利 +" + String.format("%.1f", pnl) + " 元") : Ansi.green("亏损 " + String.format("%.1f", pnl) + " 元");
        out.add(Ansi.green("✔ 卖出成交：") + Ansi.bold(q.name + " " + q.code) + " ×" + shares + "股"
                + Ansi.gray(" @ " + String.format("%.2f", q.price) + " 元，到手 " + String.format("%.1f", amount - fee) + " 元，" + pnlStr));
    }

    /** 电脑端线上交易：无场景限制（复用买卖逻辑） */
    public static void buyOnline(GameService gs, List<String> out, String code, String shares) {
        buy(gs, out, new String[]{"buy", code, shares});
    }
    public static void sellOnline(GameService gs, List<String> out, String code, String shares) {
        sell(gs, out, new String[]{"sell", code, shares});
    }

    /** 我的持仓 */
    public static void mine(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.holdings.isEmpty()) {
            out.add(Ansi.gray("你还没买过股票。股市有风险，入市需谨慎——但总比躺平强。"));
            out.add(Ansi.yellow("　　stock 查看行情 → stock buy <代码> <股数> 买入"));
            return;
        }
        out.add(Ansi.banner("我的持仓", "PORTFOLIO"));
        double totalCost = 0, totalVal = 0;
        for (GameState.StockHolding h : s.holdings) {
            GameState.StockQuote q = quote(gs, h.code);
            double val = q != null ? q.price * h.shares : h.totalCost;
            double pnl = val - h.totalCost;
            double pnlPct = h.totalCost > 0 ? pnl / h.totalCost * 100 : 0;
            String pnlStr = pnl >= 0 ? Ansi.red("+" + String.format("%.1f", pnl) + "（+" + String.format("%.1f", pnlPct) + "%）")
                    : Ansi.green(String.format("%.1f", pnl) + "（" + String.format("%.1f", pnlPct) + "%）");
            out.add(Ansi.cyan(" " + h.code) + "  " + Ansi.bold(q != null ? q.name : h.code)
                    + Ansi.gray(" ×" + h.shares + "股  成本 " + String.format("%.0f", h.totalCost) + " 现价 " + String.format("%.2f", q != null ? q.price : 0))
                    + "  " + pnlStr);
            totalCost += h.totalCost;
            totalVal += val;
        }
        double totalPnl = totalVal - totalCost;
        String ts = totalPnl >= 0 ? Ansi.red("+" + String.format("%.1f", totalPnl) + " 元") : Ansi.green(String.format("%.1f", totalPnl) + " 元");
        out.add("");
        out.add(Ansi.gray("　持仓市值 " + String.format("%.0f", totalVal) + " 元，浮动盈亏 " + ts
                + Ansi.gray("（现金 " + s.character.money + " 元）")));
    }

    /** ASCII 迷你走势 */
    public static void chart(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) { out.add(Ansi.yellow("用法：stock chart <代码>，如 stock chart WY01")); return; }
        GameState.StockQuote q = quote(gs, args[1]);
        if (q == null) { out.add(Ansi.red("没有这个股票代码。")); return; }
        out.add(Ansi.banner(q.name + " 走势", "QUOTE CHART"));
        List<Double> h = q.history;
        if (h.size() < 2) { out.add(Ansi.gray("数据太少，过一会儿再来看看。")); return; }
        double min = h.stream().mapToDouble(Double::doubleValue).min().orElse(0);
        double max = h.stream().mapToDouble(Double::doubleValue).max().orElse(1);
        double span = Math.max(1e-6, max - min);
        int cols = 24;
        for (int i = Math.max(0, h.size() - cols); i < h.size(); i++) {
            double v = h.get(i);
            int bar = (int) Math.round((v - min) / span * 12) + 1;
            boolean up = i == 0 || v >= h.get(i - 1);
            String barStr = "▁▂▃▄▅▆▇█".charAt(Math.min(7, bar - 1)) + "";
            out.add(Ansi.gray(String.format("%02d:%02d ", (i * 30 / 60) % 24, (i * 30) % 60))
                    + (up ? Ansi.red(barStr.repeat(Math.max(1, bar))) : Ansi.green(barStr.repeat(Math.max(1, bar))))
                    + Ansi.gray(" " + String.format("%.2f", v)));
        }
        out.add(Ansi.gray("　现价 " + Ansi.gold(String.format("%.2f", q.price)) + " 元，今日 " + String.format("%+.2f%%", q.dayChangePct())));
    }
}
