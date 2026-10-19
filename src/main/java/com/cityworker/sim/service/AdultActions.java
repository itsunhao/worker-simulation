package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/**
 * v2.0 成人大学系统：学历提升（初升高 → 高升专 → 专升本）+ 专业方向。
 * 报名 → 学习（熟练度）→ 毕业考试（答对全部题目）→ 学历升级 + 专业。
 */
public final class AdultActions {

    private AdultActions() {}

    public static void college(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"adu".equals(s.locationId)) {
            out.add(Ansi.red("成人大学在临江市大学城（move 成人大学）。"));
            return;
        }
        if (args.length == 0) {
            list(gs, out);
            return;
        }
        String act = args[0].toLowerCase();
        switch (act) {
            case "enroll", "报名", "报", "sign" -> enroll(gs, out, args);
            case "study", "学习", "学", "上课" -> study(gs, out, args);
            case "exam", "考试", "考", "毕业考" -> exam(gs, out, args);
            case "answer", "作答", "交卷" -> answer(gs, out, args);
            default -> {
                // 数字直接当作班级编号报名
                if (GameService.parseInt(act, -1) > 0) enroll(gs, out, args);
                else list(gs, out);
            }
        }
    }

    /** 大学信息 + 班级列表 */
    private static void list(GameService gs, List<String> out) {
        GameState s = gs.state();
        GameConfig cfg = gs.cfg();
        String curEdu = s.character.educationId;
        int rank = GameConfig.educationRank(curEdu);
        out.add(Ansi.banner("临江成人大学", "ADULT UNIVERSITY · 学历提升"));
        out.add(Ansi.gray("　当前学历：" + Ansi.bold(eduName(gs, curEdu))
                + Ansi.gray(" ｜ 专业：" + Ansi.bold(majName(gs, s.character.majorId)))));
        out.add(Ansi.gray("　白天打工，晚上充电。文凭是这座城市的敲门砖。"));
        out.add("");
        List<GameConfig.AdultClassDef> classes = cfg.adultClasses == null ? List.of() : cfg.adultClasses;
        for (int i = 0; i < classes.size(); i++) {
            GameConfig.AdultClassDef c = classes.get(i);
            int reqRank = GameConfig.educationRank(c.fromEducation);
            int toRank = GameConfig.educationRank(c.toEducation);
            boolean graduated = s.collegeGraduated.contains(c.id);
            Double prog = s.collegeProgress.get(c.id);
            String status;
            if (graduated) status = Ansi.green("已毕业 ✔");
            else if (rank < reqRank) status = Ansi.red("需" + eduName(gs, c.fromEducation) + "学历");
            else if (rank >= toRank) status = Ansi.darkGray("已超出（无需再学）");
            else if (prog == null) status = Ansi.gray("未报名");
            else if (prog >= 100) status = Ansi.gold("可考试 college exam " + c.id);
            else status = Ansi.cyan("熟练度 " + String.format("%.0f", prog) + "%");
            out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(c.icon + " " + c.name)
                    + Ansi.gray("  学费" + c.cost + "元｜考务费" + c.examFee + "元 ｜ " + status));
            out.add(Ansi.darkGray("　　" + c.desc));
        }
        out.add("");
        out.add(Ansi.yellow("报名：college enroll <编号>｜学习：college study <编号>｜考试：college exam <编号>"));
        out.add(Ansi.yellow("图形界面点「🎓 成人大学」按钮，弹窗内完成全部操作"));
    }

    /** 报名（交学费，开启熟练度） */
    private static void enroll(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：college enroll <编号>，先 college 看班级列表。"));
            return;
        }
        GameConfig.AdultClassDef c = resolve(gs, args[1]);
        if (c == null) { out.add(Ansi.red("没有这个班级，输入 college 查看。")); return; }
        if (s.collegeGraduated.contains(c.id)) {
            out.add(Ansi.yellow("你已经从「" + c.name + "」毕业了，不用再学。"));
            return;
        }
        int rank = GameConfig.educationRank(s.character.educationId);
        int reqRank = GameConfig.educationRank(c.fromEducation);
        int toRank = GameConfig.educationRank(c.toEducation);
        if (rank < reqRank) {
            out.add(Ansi.red("这个班需要" + eduName(gs, c.fromEducation) + "及以上学历（当前" + eduName(gs, s.character.educationId) + "）。"));
            return;
        }
        if (rank >= toRank) {
            out.add(Ansi.yellow("你已经是" + eduName(gs, s.character.educationId) + "学历了，这个班（" + eduName(gs, c.fromEducation) + "→" + eduName(gs, c.toEducation) + "）对你没有提升，去看看更高的班级吧。"));
            return;
        }
        if (s.character.intel < c.minIntel) {
            out.add(Ansi.red("学习需要智力 ≥ " + c.minIntel + "（当前 " + s.character.intel + "）。"));
            return;
        }
        if (s.courseProgress != null && s.courseProgress.containsKey(c.id)) {
            out.add(Ansi.yellow("你已经在「" + c.name + "」就读了，输入 college study " + c.id + " 上课。"));
            return;
        }
        if (s.character.money < c.cost) {
            out.add(Ansi.red("学费不够（需 " + c.cost + " 元）。"));
            return;
        }
        s.character.money -= c.cost;
        s.collegeProgress.put(c.id, 0.0);
        gs.advanceTime(30);
        out.add(Ansi.green("📋 报名「" + c.name + "」成功！交了 " + c.cost + " 元学费。"));
        out.add(Ansi.gray("　每周来上几次课，熟练度满 100% 就能参加毕业考试。"));
    }

    /** 学习（推进熟练度） */
    private static void study(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：college study <编号>。"));
            return;
        }
        GameConfig.AdultClassDef c = resolve(gs, args[1]);
        if (c == null) { out.add(Ansi.red("没有这个班级。")); return; }
        if (s.collegeGraduated.contains(c.id)) {
            out.add(Ansi.yellow("你已从「" + c.name + "」毕业。"));
            return;
        }
        Double prog = s.collegeProgress.get(c.id);
        if (prog == null) {
            out.add(Ansi.yellow("还没报名「" + c.name + "」，先 college enroll " + c.id + "。"));
            return;
        }
        if (s.character.stamina < 10) {
            out.add(Ansi.red("太累了，学不进去。先吃点东西或睡一觉。"));
            return;
        }
        double rate = 5 + s.character.intel * 0.25;
        rate *= 1 + gs.personalityLearnBonus();
        GameConfig.MajorDef maj = gs.major();
        if (maj != null && c.major != null && c.major.equals(maj.id)) {
            rate *= 1.2;
            out.add(Ansi.cyan("　你的「" + maj.name + "」功底让学习事半功倍！"));
        }
        double now = Math.min(100, prog + rate);
        s.collegeProgress.put(c.id, now);
        gs.changeStamina(-4);
        gs.changeHunger(-2);
        gs.changeMood(-1);
        gs.advanceTime(120);
        out.add(Ansi.cyan("📖 你在大学自习室里啃了2小时「" + c.name + "」……"));
        out.add(Ansi.green("　熟练度 " + String.format("%.0f", prog) + "% → " + String.format("%.0f", now) + "%"));
        if (now >= 100) {
            out.add(Ansi.gold("　🎯 课程学完了！去报名处交考务费参加毕业考试：college exam " + c.id));
        }
    }

    /** 毕业考试（题库在终端逐题作答；UI 弹窗走 /api/game/quiz） */
    private static void exam(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：college exam <编号>。"));
            return;
        }
        GameConfig.AdultClassDef c = resolve(gs, args[1]);
        if (c == null) { out.add(Ansi.red("没有这个班级。")); return; }
        if (s.collegeGraduated.contains(c.id)) {
            out.add(Ansi.yellow("你已从「" + c.name + "」毕业。"));
            return;
        }
        Double prog = s.collegeProgress.get(c.id);
        if (prog == null || prog < 100) {
            out.add(Ansi.red("熟练度还不够（当前 " + (prog == null ? 0 : (int) Math.round(prog)) + "%），先 college study " + c.id + " 上课。"));
            return;
        }
        if (s.character.money < c.examFee) {
            out.add(Ansi.red("考务费不够（需 " + c.examFee + " 元）。"));
            return;
        }
        // 有题库 → 终端逐题作答；同时 UI 弹窗可直接从 college 面板进入答题
        if (c.questions != null && !c.questions.isEmpty()) {
            s.character.money -= c.examFee;
            s.pendingAdultExam = c.id;
            gs.advanceTime(60);
            gs.changeStamina(-2);
            out.add(Ansi.banner("毕业考试", c.name + " · 考务费已扣 " + c.examFee + " 元"));
            out.add(Ansi.gray("　请作答（共 " + c.questions.size() + " 题，全部答对才能毕业）："));
            List<GameConfig.QuizQ> qs = c.questions;
            String[] letters = {"A", "B", "C", "D", "E"};
            for (int i = 0; i < qs.size(); i++) {
                GameConfig.QuizQ qq = qs.get(i);
                String qType = "判断".equals(qq.type) ? "判断" : "选择";
                StringBuilder sb = new StringBuilder();
                sb.append(Ansi.cyan("　第" + (i + 1) + "题 [" + qType + "] ")).append(Ansi.bold(qq.q)).append("\n");
                for (int o = 0; o < qq.options.size(); o++) {
                    sb.append(Ansi.gray("　　" + letters[o] + ". " + qq.options.get(o)));
                    if (o < qq.options.size() - 1) sb.append("\n");
                }
                out.add(sb.toString());
            }
            out.add(Ansi.yellow("　答题格式：college answer <题号><选项>…（如 college answer 1A2B3C4D5A）"));
            out.add(Ansi.gray("　也可以直接用图形界面点「📝 开始毕业考试」，弹窗里作答更直观。"));
            return;
        }
        // 无题库 → 概率判定（兜底）
        s.character.money -= c.examFee;
        gs.advanceTime(60);
        gs.changeStamina(-2);
        double passRate = 0.35 + 0.3 * (prog / 100.0) + s.character.intel * 0.003;
        passRate = Math.min(0.92, passRate * (1 + gs.personalityLearnBonus()));
        out.add(Ansi.banner("毕业考试", c.name + " · 考务费 " + c.examFee + " 元"));
        out.add(Ansi.gray("　你坐在考场里，笔尖沙沙作响……"));
        if (gs.rnd().nextDouble() < passRate) {
            graduate(gs, c);
            out.add(Ansi.gold("🎉 恭喜通过！你获得了「" + c.name + "」毕业证！"));
            out.add(Ansi.gray("　学历提升为" + eduName(gs, s.character.educationId)
                    + (c.major != null && !c.major.isBlank() ? "，专业转向" + majName(gs, c.major) : "")
                    + "。声望 +20，心情 +12。"));
        } else {
            s.collegeProgress.put(c.id, 60.0);
            gs.changeMood(-5);
            out.add(Ansi.red("　差一点点……没考过。"));
            out.add(Ansi.gray("　熟练度回落到60%，再补补课，随时可以再战。"));
        }
    }

    /** 终端交卷：college answer 1A2B3C4D5A */
    private static void answer(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：college answer <题号><选项>…（如 college answer 1A2B3C4D5A）"));
            return;
        }
        String classId = s.pendingAdultExam;
        if (classId == null) {
            out.add(Ansi.yellow("还没有进行中的毕业考试。先输入 college exam <编号> 开考。"));
            return;
        }
        GameConfig.AdultClassDef c = resolve(gs, classId);
        if (c == null || c.questions == null || c.questions.isEmpty()) {
            out.add(Ansi.red("考试会话异常，请重新 college exam。"));
            s.pendingAdultExam = null;
            return;
        }
        String seq = args[1].toUpperCase();
        List<GameConfig.QuizQ> qs = c.questions;
        String[] letters = {"A", "B", "C", "D", "E"};
        // 解析 "1A2B3C4D5A" → [A,B,C,D,A]；也兼容纯 "ABC..." 或 "12345"
        List<Integer> answers = new java.util.ArrayList<>();
        int letterPos = 0;
        for (int i = 0; i < qs.size(); i++) {
            int opt = -1;
            while (letterPos < seq.length() && Character.isDigit(seq.charAt(letterPos))) letterPos++;
            if (letterPos < seq.length()) {
                char cOpt = seq.charAt(letterPos);
                opt = cOpt - 'A';
                if (opt < 0 || opt >= qs.get(i).options.size()) opt = -1;
                letterPos++;
            } else if (i < seq.length()) {
                // 纯数字索引（1 表示 A，2 表示 B…）
                int digit = seq.charAt(i) - '1';
                if (digit >= 0 && digit < qs.get(i).options.size()) opt = digit;
            }
            answers.add(opt);
        }
        // 逐题判分
        int correct = 0;
        List<String> detail = new java.util.ArrayList<>();
        for (int i = 0; i < qs.size(); i++) {
            boolean ok = answers.get(i) != null && answers.get(i) == qs.get(i).answer;
            if (ok) correct++;
            detail.add((ok ? Ansi.green("✓") : Ansi.red("✗")) + " 第" + (i + 1) + "题"
                    + (ok ? "" : "（正确答案 " + letters[qs.get(i).answer] + "）"));
        }
        out.add(Ansi.banner("阅卷结果", c.name + " · " + correct + "/" + qs.size()));
        detail.forEach(d -> out.add(Ansi.gray("　" + d)));
        if (correct == qs.size()) {
            graduate(gs, c);
            out.add(Ansi.gold("🎉 全部答对！你通过了「" + c.name + "」毕业考试！"));
            out.add(Ansi.gray("　学历提升为" + eduName(gs, s.character.educationId)
                    + (c.major != null && !c.major.isBlank() ? "，专业转向" + majName(gs, c.major) : "")
                    + "。声望 +20，心情 +12。"));
        } else {
            s.collegeProgress.put(c.id, 60.0);
            gs.changeMood(-5);
            out.add(Ansi.red("　答错 " + (qs.size() - correct) + " 题，毕业考试没通过……熟练度回落到60%，补补课再战！"));
        }
        s.pendingAdultExam = null;
    }

    /** 毕业结算：学历升级 + 专业 + 奖励（供答题判定通过后调用） */
    public static void graduate(GameService gs, GameConfig.AdultClassDef c) {
        GameState s = gs.state();
        if (s.collegeGraduated.contains(c.id)) return;
        s.collegeGraduated.add(c.id);
        if (c.toEducation != null && !c.toEducation.isBlank()) {
            s.character.educationId = c.toEducation;
        }
        if (c.major != null && !c.major.isBlank()) {
            s.character.majorId = c.major;
        }
        gs.changePrestige(20);
        gs.changeMood(12);
    }

    static GameConfig.AdultClassDef resolve(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        List<GameConfig.AdultClassDef> cs = gs.cfg().adultClasses == null ? List.of() : gs.cfg().adultClasses;
        if (idx >= 1 && idx <= cs.size()) return cs.get(idx - 1);
        return cs.stream().filter(c -> c.id.equals(arg)).findFirst().orElse(null);
    }

    public static String eduName(GameService gs, String id) {
        return gs.cfg().education.stream().filter(e -> id != null && id.equals(e.id))
                .findFirst().map(e -> e.name).orElse(id == null ? "未知" : id);
    }

    public static String majName(GameService gs, String id) {
        return gs.cfg().majors.stream().filter(m -> id != null && id.equals(m.id))
                .findFirst().map(m -> m.name).orElse(id == null ? "无专业" : id);
    }
}
