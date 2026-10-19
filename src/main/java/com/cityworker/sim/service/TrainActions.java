package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 技能培训系统：报名 / 学习 / 结业考试 获取证书 */
public final class TrainActions {

    private TrainActions() {}

    public static void train(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"training".equals(s.locationId)) {
            out.add(Ansi.red("你不在技能培训中心。输入 move 培训中心 前往。"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.banner("成人技能培训中心", "TRAINING"));
            List<GameConfig.CourseDef> courses = gs.cfg().courses;
            for (int i = 0; i < courses.size(); i++) {
                GameConfig.CourseDef c = courses.get(i);
                boolean done = s.certificates.contains(c.certId);
                Double prog = s.courseProgress.get(c.id);
                String status;
                if (done) status = Ansi.green("已获证书 ✔");
                else if (prog == null) status = Ansi.gray("未报名");
                else status = prog >= 100 ? Ansi.gold("熟练度100%，可考试 exam") : Ansi.cyan("熟练度 " + String.format("%.0f", prog) + "%");
                out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(c.name)
                        + Ansi.gray("  学费" + c.cost + "元｜学时" + c.hours + "h｜考务费" + c.examFee + "元 ｜ " + status));
                out.add(Ansi.darkGray("　　" + c.desc + " → 证书：" + c.certName));
            }
            out.add("");
            out.add(Ansi.yellow("输入 train <编号> 报名并学习2小时（如 train 1）"));
            out.add(Ansi.yellow("输入 exam <编号> 参加结业考试"));
            return;
        }
        GameConfig.CourseDef c = resolveCourse(gs, args[0]);
        if (c == null) {
            out.add(Ansi.red("没有这门课程，输入 train 查看。"));
            return;
        }
        if (s.certificates.contains(c.certId)) {
            out.add(Ansi.yellow("你已经拿到「" + c.certName + "」了，不用再学。"));
            return;
        }
        Double prog = s.courseProgress.get(c.id);
        if (prog == null) {
            if (s.character.intel < c.minIntel) {
                out.add(Ansi.red("学这门课需要智力 ≥ " + c.minIntel + "（当前 " + s.character.intel + "），先去打点动脑的工练练？"));
                return;
            }
            if (s.character.money < c.cost) {
                out.add(Ansi.red("学费不够（需 " + c.cost + " 元，差 " + (c.cost - s.character.money) + " 元）。"));
                return;
            }
            s.character.money -= c.cost;
            s.courseProgress.put(c.id, 0.0);
            out.add(Ansi.green("📋 报名「" + c.name + "」成功！交了 " + c.cost + " 元学费。"));
            out.add(Ansi.gray("　今天开始，每天晚上来学2小时，熟练度满了就能考试。"));
            return;
        }
        // 学习 2 小时
        double rate = 6 + s.character.intel * 0.2;
        rate *= 1 + gs.personalityLearnBonus();
        GameConfig.MajorDef maj = gs.major();
        if (maj != null && c.id.equals(maj.courseAffinity)) {
            rate *= 1.25;
            out.add(Ansi.cyan("　你的「" + maj.name + "」专业功底让学习事半功倍！"));
        }
        double now = Math.min(100, prog + rate);
        s.courseProgress.put(c.id, now);
        gs.changeStamina(-3);
        gs.changeHunger(-2);
        gs.changeMood(-1);
        gs.advanceTime(120);
        out.add(Ansi.cyan("📖 你埋头学习了2小时「" + c.name + "」……"));
        out.add(Ansi.green("　熟练度 " + String.format("%.0f", prog) + "% → " + String.format("%.0f", now) + "%"));
        if (now >= 100) {
            out.add(Ansi.gold("　🎯 熟练度已满！去前台交考务费参加考试：exam " + c.id));
        }
    }

    public static void exam(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"training".equals(s.locationId)) {
            out.add(Ansi.red("考试要去培训中心（move 培训中心）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：exam <编号>，先 train 查看课程。"));
            return;
        }
        GameConfig.CourseDef c = resolveCourse(gs, args[0]);
        if (c == null) {
            out.add(Ansi.red("没有这门课程。"));
            return;
        }
        if (s.certificates.contains(c.certId)) {
            out.add(Ansi.yellow("你已经有「" + c.certName + "」了。"));
            return;
        }
        Double prog = s.courseProgress.get(c.id);
        if (prog == null || prog < 100) {
            out.add(Ansi.red("熟练度还不够（当前 " + (prog == null ? 0 : String.format("%.0f", prog)) + "%），先把课学完（train <编号>）。"));
            return;
        }
        if (s.character.money < c.examFee) {
            out.add(Ansi.red("考务费不够（需 " + c.examFee + " 元）。"));
            return;
        }
        s.character.money -= c.examFee;
        gs.advanceTime(60);
        gs.changeStamina(-2);

        double passRate = 0.35 + 0.3 * (prog / 100.0) + s.character.intel * 0.003;
        passRate = Math.min(0.92, passRate * (1 + gs.personalityLearnBonus()));
        out.add(Ansi.banner("结业考试", c.name + " · 考务费 " + c.examFee + " 元"));
        out.add(Ansi.gray("　你坐在考场里，笔尖沙沙作响……"));
        if (gs.rnd().nextDouble() < passRate) {
            s.certificates.add(c.certId);
            gs.changePrestige(15);
            gs.changeMood(10);
            out.add(Ansi.gold("🎉 恭喜通过！你获得了「" + c.certName + "」！"));
            out.add(Ansi.gray("　声望 +15，心情 +10。现在可以去人才市场找相关特殊职业了。"));
        } else {
            s.courseProgress.put(c.id, 60.0);
            gs.changeMood(-5);
            out.add(Ansi.red("　差一点点……没考过。"));
            out.add(Ansi.gray("　熟练度回落到60%，再补补课，随时可以再战。"));
        }
    }

    private static GameConfig.CourseDef resolveCourse(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().courses.size()) return gs.cfg().courses.get(idx - 1);
        return gs.cfg().courses.stream().filter(c -> c.id.equals(arg)).findFirst().orElse(null);
    }
}
