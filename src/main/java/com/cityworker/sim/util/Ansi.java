package com.cityworker.sim.util;

/** ANSI 终端颜色工具（xterm.js 渲染） */
public final class Ansi {
    public static final String RESET = "\u001b[0m";

    private Ansi() {}

    public static String c(String code, String s) {
        return "\u001b[" + code + "m" + s + RESET;
    }
    public static String bold(String s)   { return c("1", s); }
    public static String dim(String s)    { return c("2", s); }
    public static String red(String s)    { return c("31", s); }
    public static String green(String s)  { return c("32", s); }
    public static String yellow(String s) { return c("33", s); }
    public static String blue(String s)   { return c("34", s); }
    public static String magenta(String s){ return c("35", s); }
    public static String cyan(String s)   { return c("36", s); }
    public static String white(String s)  { return c("37", s); }
    public static String orange(String s) { return c("38;5;214", s); }
    public static String gold(String s)   { return c("38;5;220", s); }
    public static String pink(String s)   { return c("38;5;211", s); }
    public static String gray(String s)   { return c("38;5;245", s); }
    public static String darkGray(String s){ return c("38;5;240", s); }

    /** 终端横幅 */
    public static String banner(String title, String sub) {
        int w = 56;
        StringBuilder sb = new StringBuilder();
        sb.append(darkGray("┌" + "─".repeat(w - 2) + "┐")).append("\r\n");
        sb.append(darkGray("│" + " ".repeat(w - 2) + "│")).append("\r\n");
        sb.append(darkGray("│" + center(gold(title), w - 2) + "│")).append("\r\n");
        sb.append(darkGray("│" + center(gray(sub), w - 2) + "│")).append("\r\n");
        sb.append(darkGray("│" + " ".repeat(w - 2) + "│")).append("\r\n");
        sb.append(darkGray("└" + "─".repeat(w - 2) + "┘"));
        return sb.toString();
    }

    /** 按纯文本宽度居中（内容可能带 ANSI） */
    private static String center(String s, int width) {
        int len = plain(s).length();
        if (len >= width) return s;
        int left = (width - len) / 2;
        return " ".repeat(left) + s + " ".repeat(width - len - left);
    }

    /** 分隔线 */
    public static String hr() {
        return darkGray("─".repeat(56));
    }

    /** 去掉所有 ANSI 转义码，得到纯文本 */
    public static String plain(String s) {
        if (s == null) return "";
        return s.replaceAll("\\u001b\\[[;\\d]*m", "");
    }
}
