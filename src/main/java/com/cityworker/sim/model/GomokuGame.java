package com.cityworker.sim.model;

/** 公园五子棋对局（与棋友对赌，15×15） */
public class GomokuGame {
    public static final int N = 15;
    public int[][] board = new int[N][N];   // 0 空 1 玩家 2 棋友
    public int bet;
    public boolean playerTurn = true;
    public String phase = "idle";           // idle / play / done
    public int result;                      // 1 赢 0 平 -1 输
    public int payout;
    public int moves;

    public boolean inRange(int r, int c) { return r >= 0 && r < N && c >= 0 && c < N; }

    public boolean hasFive(int r, int c, int who) {
        int[][] dirs = {{1, 0}, {0, 1}, {1, 1}, {1, -1}};
        for (int[] d : dirs) {
            int cnt = 1;
            for (int s = 1; s <= 4; s++) {
                int nr = r + d[0] * s, nc = c + d[1] * s;
                if (inRange(nr, nc) && board[nr][nc] == who) cnt++; else break;
            }
            for (int s = 1; s <= 4; s++) {
                int nr = r - d[0] * s, nc = c - d[1] * s;
                if (inRange(nr, nc) && board[nr][nc] == who) cnt++; else break;
            }
            if (cnt >= 5) return true;
        }
        return false;
    }

    public boolean boardFull() {
        for (int[] row : board) for (int v : row) if (v == 0) return false;
        return true;
    }
}
