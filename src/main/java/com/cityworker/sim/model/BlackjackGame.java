package com.cityworker.sim.model;

import java.util.ArrayList;
import java.util.List;

/** 公园 21 点牌局（与棋友对赌） */
public class BlackjackGame {
    public List<String> deck = new ArrayList<>();
    public List<String> player = new ArrayList<>();
    public List<String> dealer = new ArrayList<>();
    public int bet;
    public String phase = "idle";   // idle / play / done
    public boolean playerStand;
    public int result;              // 1 赢 0 平 -1 输
    public int payout;              // 本局净盈亏

    public int playerScore() { return score(player); }
    public int dealerScore() { return score(dealer); }

    public static int cardValue(String c) {
        String v = c.substring(1);
        if (v.equals("A")) return 11;
        if (v.equals("K") || v.equals("Q") || v.equals("J")) return 10;
        return Integer.parseInt(v);
    }

    public static int score(List<String> hand) {
        int sum = 0, aces = 0;
        for (String c : hand) {
            int v = cardValue(c);
            if (c.substring(1).equals("A")) aces++;
            sum += v;
        }
        while (sum > 21 && aces > 0) { sum -= 10; aces--; }
        return sum;
    }

    public String draw() {
        if (deck.isEmpty()) {
            String[] suits = {"♠", "♥", "♦", "♣"};
            String[] ranks = {"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"};
            for (String s : suits) for (String r : ranks) deck.add(s + r);
            java.util.Collections.shuffle(deck);
        }
        return deck.remove(deck.size() - 1);
    }
}
