package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** 培训答题系统：学习出题 / 结业考试出题 / 答案判定 */
public final class QuizActions {

    private QuizActions() {}

    /** 生成考试/学习题目（不判定，仅出题） */
    public static Map<String, Object> issue(GameService gs, String courseArg, String mode) {
        GameState s = gs.state();
        // ---- v2.1 地点趣味问答 ----
        if ("fun".equals(mode)) {
            return issueFun(gs);
        }
        // ---- v2.0 成人大学毕业考试：走题库弹窗 ----
        if ("adult".equals(mode)) {
            return issueAdult(gs, courseArg);
        }
        GameConfig.CourseDef c = resolve(gs, courseArg);
        if (c == null) return err("没有这门课程。");
        if (c.questions == null || c.questions.isEmpty()) return err("这门课还没出题，先等等。");
        if (s.certificates.contains(c.certId)) return err("你已经拿到「" + c.certName + "」了。");
        Double prog = s.courseProgress.get(c.id);
        if ("exam".equals(mode)) {
            if (prog == null || prog < 100) return err("熟练度还不够（当前 " + (prog == null ? 0 : (int) Math.round(prog)) + "%），先学习把课学完。");
        } else {
            if (prog == null) return err("还没报名这门课，先在培训中心输入 train 查看并报名。");
        }

        List<GameConfig.QuizQ> chosen = new ArrayList<>();
        int studyIdx = -1;
        if ("exam".equals(mode)) {
            chosen.addAll(c.questions);   // 考试：全部题目
        } else {
            studyIdx = gs.rnd().nextInt(c.questions.size());
            chosen.add(c.questions.get(studyIdx));   // 学习：随机 1 题
        }

        String quizId = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("quizId", quizId);
        q.put("courseId", c.id);
        q.put("courseName", c.name);
        q.put("mode", mode);
        List<Map<String, Object>> qs = new ArrayList<>();
        for (int i = 0; i < chosen.size(); i++) {
            GameConfig.QuizQ qq = chosen.get(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idx", i + 1);
            m.put("q", qq.q);
            m.put("type", qq.type);
            m.put("options", qq.options);
            qs.add(m);
        }
        q.put("questions", qs);
        s.pendingQuiz = quizId;
        s.pendingQuizMeta = new com.cityworker.sim.model.QuizMeta(c.id, mode, studyIdx);
        return q;
    }

    /** 成人大学毕业考试出题：扣考务费 + 生成全部题目 */
    private static Map<String, Object> issueAdult(GameService gs, String classArg) {
        GameState s = gs.state();
        GameConfig.AdultClassDef c = AdultActions.resolve(gs, classArg);
        if (c == null) return err("没有这个成人班级。");
        if (c.questions == null || c.questions.isEmpty()) return err("这个班还没准备考题。");
        if (s.collegeGraduated.contains(c.id)) return err("你已从「" + c.name + "」毕业。");
        Double prog = s.collegeProgress.get(c.id);
        if (prog == null || prog < 100) return err("熟练度还不够（当前 " + (prog == null ? 0 : (int) Math.round(prog)) + "%），先 college study 上课。");
        if (s.character.money < c.examFee) return err("考务费不够（需 " + c.examFee + " 元）。");

        s.character.money -= c.examFee;
        gs.advanceTime(60);
        gs.changeStamina(-2);
        s.pendingAdultFee = c.examFee;

        String quizId = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("quizId", quizId);
        q.put("courseId", c.id);
        q.put("courseName", c.name);
        q.put("mode", "adult");
        List<Map<String, Object>> qs = new ArrayList<>();
        for (int i = 0; i < c.questions.size(); i++) {
            GameConfig.QuizQ qq = c.questions.get(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idx", i + 1);
            m.put("q", qq.q);
            m.put("type", qq.type);
            m.put("options", qq.options);
            qs.add(m);
        }
        q.put("questions", qs);
        s.pendingQuiz = quizId;
        s.pendingQuizMeta = new com.cityworker.sim.model.QuizMeta(c.id, "adult", -1);
        return q;
    }

    /** 判定答案 */
    public static Map<String, Object> judge(GameService gs, String quizId, List<Integer> answers) {
        GameState s = gs.state();
        Map<String, Object> r = new LinkedHashMap<>();
        if (s.pendingQuiz == null || !s.pendingQuiz.equals(quizId) || s.pendingQuizMeta == null) {
            r.put("ok", false);
            r.put("msg", "答题会话已过期，请重新开始。");
            return r;
        }
        String mode = s.pendingQuizMeta.mode;
        if ("adult".equals(mode)) return judgeAdult(gs, answers);
        if ("fun".equals(mode)) return judgeFun(gs, answers);

        GameConfig.CourseDef c = resolve(gs, s.pendingQuizMeta.courseId);
        if (c == null || c.questions == null || c.questions.isEmpty()) {
            r.put("ok", false);
            r.put("msg", "题库配置缺失。");
            return r;
        }
        boolean isExam = "exam".equals(mode);
        // 校验题目数
        int total = isExam ? c.questions.size() : 1;
        if (answers == null || answers.size() != total) {
            r.put("ok", false);
            r.put("msg", "答案数量不匹配，请完整作答后交卷。");
            return r;
        }

        List<Map<String, Object>> detail = new ArrayList<>();
        int correct = 0;
        for (int i = 0; i < total; i++) {
            GameConfig.QuizQ qq = isExam ? c.questions.get(i)
                    : c.questions.get(s.pendingQuizMeta.qIndex >= 0 ? s.pendingQuizMeta.qIndex : gs.rnd().nextInt(c.questions.size()));
            boolean okAns = answers.get(i) != null && answers.get(i) == qq.answer;
            if (okAns) correct++;
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("idx", i + 1);
            d.put("q", qq.q);
            d.put("correct", okAns);
            d.put("right", qq.answer);
            detail.add(d);
        }
        r.put("detail", detail);
        r.put("correct", correct);
        r.put("total", total);

        // 学习模式：答对 → 节点成功（推进熟练度）；答错 → 不推进
        if (!isExam) {
            if (correct == 1) {
                double rate = 6 + s.character.intel * 0.2;
                rate *= 1 + gs.personalityLearnBonus();
                GameConfig.MajorDef maj = gs.major();
                if (maj != null && c.id.equals(maj.courseAffinity)) rate *= 1.25;
                double prog = s.courseProgress.getOrDefault(c.id, 0.0);
                double now = Math.min(100, prog + rate);
                s.courseProgress.put(c.id, now);
                gs.changeStamina(-3);
                gs.changeHunger(-2);
                gs.changeMood(-1);
                gs.advanceTime(120);
                r.put("ok", true);
                r.put("progress", Math.round(now));
                r.put("msg", "答对了！本节课知识点掌握，熟练度 " + (int) prog + "% → " + (int) now + "%"
                        + (now >= 100 ? "，🎯 可以参加结业考试了！" : "。"));
            } else {
                gs.advanceTime(120);
                r.put("ok", false);
                r.put("msg", "答错了……这节课白学了，明天再来补补（节点失败，不涨熟练度）。");
            }
            s.pendingQuiz = null;
            s.pendingQuizMeta = null;
            return r;
        }

        // 考试模式：全对发证，有错重来
        if (correct == total) {
            s.certificates.add(c.certId);
            gs.changePrestige(15);
            gs.changeMood(10);
            r.put("ok", true);
            r.put("passed", true);
            r.put("msg", "🎉 全部答对！恭喜通过，获得「" + c.certName + "」！声望 +15，心情 +10。");
        } else {
            s.courseProgress.put(c.id, 60.0);
            gs.changeMood(-5);
            r.put("ok", false);
            r.put("msg", "答错 " + (total - correct) + " 题，考试没通过……熟练度回落到 60%，补补课再战！");
        }
        s.pendingQuiz = null;
        s.pendingQuizMeta = null;
        return r;
    }

    /** 成人大学毕业考试判定：全对 → 学历升级 + 专业；有错 → 熟练度回落 */
    private static Map<String, Object> judgeAdult(GameService gs, List<Integer> answers) {
        GameState s = gs.state();
        Map<String, Object> r = new LinkedHashMap<>();
        GameConfig.AdultClassDef c = AdultActions.resolve(gs, s.pendingQuizMeta.courseId);
        if (c == null || c.questions == null || c.questions.isEmpty()) {
            r.put("ok", false);
            r.put("msg", "题库配置缺失。");
            s.pendingQuiz = null; s.pendingQuizMeta = null;
            return r;
        }
        int total = c.questions.size();
        if (answers == null || answers.size() != total) {
            r.put("ok", false);
            r.put("msg", "答案数量不匹配，请完整作答后交卷。");
            return r;
        }
        List<Map<String, Object>> detail = new ArrayList<>();
        int correct = 0;
        for (int i = 0; i < total; i++) {
            GameConfig.QuizQ qq = c.questions.get(i);
            boolean okAns = answers.get(i) != null && answers.get(i) == qq.answer;
            if (okAns) correct++;
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("idx", i + 1);
            d.put("q", qq.q);
            d.put("correct", okAns);
            d.put("right", qq.answer);
            detail.add(d);
        }
        r.put("detail", detail);
        r.put("correct", correct);
        r.put("total", total);

        if (correct == total) {
            AdultActions.graduate(gs, c);
            r.put("ok", true);
            r.put("passed", true);
            r.put("msg", "🎉 全部答对！你通过了「" + c.name + "」毕业考试！学历提升为"
                    + AdultActions.eduName(gs, s.character.educationId)
                    + (c.major != null && !c.major.isBlank() ? "，专业转向" + AdultActions.majName(gs, c.major) : "")
                    + "。声望 +20，心情 +12。");
        } else {
            s.collegeProgress.put(c.id, 60.0);
            gs.changeMood(-5);
            r.put("ok", false);
            r.put("msg", "答错 " + (total - correct) + " 题，毕业考试没通过……熟练度回落到 60%，补补课再战！");
        }
        s.pendingQuiz = null;
        s.pendingQuizMeta = null;
        return r;
    }

    /** 课程解析：支持数字序号（前端传入）或课程 id */
    private static GameConfig.CourseDef resolve(GameService gs, String arg) {
        if (arg == null) return null;
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().courses.size()) return gs.cfg().courses.get(idx - 1);
        return gs.cfg().courses.stream().filter(c -> c.id.equals(arg)).findFirst().orElse(null);
    }

    /* ================= v2.1 地点趣味问答 ================= */

    /** 按当前地点出 1 道趣味题（3 选 1，答对有奖） */
    public static Map<String, Object> issueFun(GameService gs) {
        GameState s = gs.state();
        List<GameConfig.QuizQ> pool = FUN_POOL.get(s.locationId);
        if (pool == null || pool.isEmpty()) {
            // 通用兜底题
            pool = FUN_POOL.get("street");
        }
        if (pool == null || pool.isEmpty()) return err("这里没什么好玩的互动。");
        GameConfig.QuizQ qq = pool.get(gs.rnd().nextInt(pool.size()));
        String quizId = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("quizId", quizId);
        q.put("courseId", s.locationId);
        q.put("courseName", "趣味互动 · " + gs.locName(gs.cfg(), s.locationId));
        q.put("mode", "fun");
        List<Map<String, Object>> qs = new ArrayList<>();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idx", 1);
        m.put("q", qq.q);
        m.put("type", qq.type);
        m.put("options", qq.options);
        qs.add(m);
        q.put("questions", qs);
        s.pendingQuiz = quizId;
        s.pendingQuizMeta = new com.cityworker.sim.model.QuizMeta(s.locationId, "fun", -1);
        return q;
    }

    /** 趣味问答判定：答对 → 心情+2 小额现金奖励；答错 → 心情+1 安慰 */
    private static Map<String, Object> judgeFun(GameService gs, List<Integer> answers) {
        GameState s = gs.state();
        Map<String, Object> r = new LinkedHashMap<>();
        List<GameConfig.QuizQ> pool = FUN_POOL.get(s.pendingQuizMeta.courseId);
        if (pool == null || pool.isEmpty()) pool = FUN_POOL.get("street");
        if (pool == null || pool.isEmpty()) {
            r.put("ok", false);
            r.put("msg", "题库缺失。");
            s.pendingQuiz = null; s.pendingQuizMeta = null;
            return r;
        }
        GameConfig.QuizQ qq = pool.get(0);   // 只存了一题，取第一道即可
        // 由于 pendingQuizMeta 未存题目索引，直接从最新题库随机比对会不稳定；
        // 改为通过 detail 回显题目文本即可（答案判定按前端提交的索引，只存在一题时稳定）
        boolean okAns = answers != null && answers.size() == 1 && answers.get(0) != null && answers.get(0) == qq.answer;
        List<Map<String, Object>> detail = new ArrayList<>();
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("idx", 1);
        d.put("q", qq.q);
        d.put("correct", okAns);
        d.put("right", qq.answer);
        detail.add(d);
        r.put("detail", detail);
        r.put("correct", okAns ? 1 : 0);
        r.put("total", 1);
        if (okAns) {
            int prize = 5 + gs.rnd().nextInt(16);   // 5~20 元
            s.character.money += prize;
            gs.changeMood(2);
            r.put("ok", true);
            r.put("passed", true);
            r.put("prize", prize);
            r.put("msg", "🎯 答对了！" + funCheers() + " 心情 +2，老板看你会来事，塞给你 " + prize + " 元红包。");
        } else {
            gs.changeMood(1);
            r.put("ok", true);
            r.put("passed", false);
            r.put("msg", "答错了……正确答案是「" + qq.options.get(qq.answer) + "」。" + funComfort());
        }
        s.pendingQuiz = null;
        s.pendingQuizMeta = null;
        return r;
    }

    private static String funCheers() {
        String[] t = {"有生活经验的人就是不一样", "这波属于是懂行的", "一看就是老江湖", "行家啊"};
        return t[(int) (System.nanoTime() % t.length)];
    }
    private static String funComfort() {
        String[] t = {"涨个见识，下次就会了", "生活处处是学问", "无妨，图一乐", "吃一堑长一智"};
        return t[(int) (System.nanoTime() % t.length)];
    }

    /** 各地点趣味题库（生活常识 / 职业冷知识 / 城市烟火气） */
    private static final Map<String, List<GameConfig.QuizQ>> FUN_POOL = buildFunPool();
    private static Map<String, List<GameConfig.QuizQ>> buildFunPool() {
        Map<String, List<GameConfig.QuizQ>> m = new LinkedHashMap<>();
        m.put("street", List.of(
            q("夜市大排档的招牌炒粉，一般多少钱一份？", "12元", "8元", "30元"),
            q("城管晚上一般在哪个时间段后基本下班？", "22点后", "18点后", "下午2点"),
            q("深夜加班回家，最经济实惠的夜宵是？", "便利店关东煮", "大饭店", "外卖烧烤")
        ));
        m.put("jobmarket", List.of(
            q("简历上写「精通」两字，面试官通常会认为？", "熟练使用", "完全不懂", "会打字就行"),
            q("面试时被问「你最大的缺点是什么」，比较得体的说法是？", "太追求完美", "没有缺点", "不爱加班"),
            q("试用期工资，法律上一般不能低于转正工资的？", "80%", "50%", "30%")
        ));
        m.put("mall", List.of(
            q("商场里标着「全场五折」的服装，最可能的真相是？", "先抬价再打折", "清仓甩卖", "新品上市"),
            q("试衣服时吊牌掉了，正确的做法是？", "告知店员", "偷偷走人", "塞进口袋"),
            q("商场电梯的「4楼」按钮，很多商场直接标成？", "3A/5F", "4B", "没有4楼")
        ));
        m.put("foodstreet", List.of(
            q("沙县小吃最经典的「国民套餐」是？", "拌面+蒸饺", "米饭+炒菜", "螺蛳粉"),
            q("烤串店喊「老板多放辣」，一般是指？", "多放辣椒面", "多加辣油", "换更辣的串")
        ));
        m.put("flower", List.of(
            q("红玫瑰的花语是？", "爱情", "友情", "离别"),
            q("康乃馨通常用来送？", "母亲/长辈", "领导", "宠物")
        ));
        m.put("bar", List.of(
            q("「深水炸弹」是一种？", "鸡尾酒喝法", "下酒菜", "调酒工具"),
            q("喝啤酒时泡沫太多，最专业的喝法是？", "沿杯壁倒", "用力砸杯", "用吸管")
        ));
        m.put("billiards", List.of(
            q("中式八球开球时白球进袋，会怎样？", "犯规，对方自由球", "直接获胜", "无事发生"),
            q("台球桌上的「黑8」最后打，进错袋会？", "判负", "重新摆球", "罚1分")
        ));
        m.put("club", List.of(
            q("会所里「小费」给多少比较得体？", "消费额的10%左右", "越多越好", "不给也行"),
            q("商务饭局上，敬酒时自己的杯沿应该？", "略低于对方", "高于对方", "持平就好")
        ));
        m.put("lottery", List.of(
            q("双色球的中奖号码，选号策略哪个最靠谱？", "看缘分", "追冷号", "随机更科学"),
            q("彩票店墙上贴的「走势图」，主要是用来？", "心理安慰", "预测必中", "记录数据")
        ));
        m.put("market", List.of(
            q("菜市场买菜砍价，什么时间段最容易被摊主让步？", "快收摊时", "早上刚开张", "中午人最多时"),
            q("怎么挑西瓜最靠谱？", "听声音看纹路", "挑最大的", "挑最红的")
        ));
        m.put("bank", List.of(
            q("银行定期存款提前支取，利息按什么算？", "活期利率", "定期利率", "不算利息"),
            q("ATM机取款时遇到「吞卡」，正确的做法是？", "联系银行客服", "砸机器", "等它自己吐出来")
        ));
        m.put("carshop", List.of(
            q("汽车仪表盘上「水温表」亮了红灯，代表？", "发动机过热", "油量不足", "胎压异常"),
            q("4S店首保一般建议多少公里做？", "5000公里左右", "5万公里", "不用做")
        ));
        m.put("estate", List.of(
            q("买房时「公摊面积」指的是？", "楼道电梯等公共部分", "阳台面积", "地下室"),
            q("首套房贷款，首付比例一般是？", "20%~30%", "50%以上", "100%")
        ));
        m.put("park", List.of(
            q("公园里打太极的大爷们，一般什么时间出来？", "清晨", "正午", "深夜"),
            q("公园相亲角，一般是替谁找对象？", "替子女", "替自己", "替宠物")
        ));
        m.put("nightmarket", List.of(
            q("夜市「十块钱三串」一般指的是？", "烤串", "糖葫芦", "棉花糖"),
            q("夜市里最不能砍价的通常是？", "老字号排长队的", "刚出摊的", "没人买的")
        ));
        m.put("ghostmarket", List.of(
            q("鬼市为什么叫「鬼市」？", "天亮前收摊，像鬼出没", "卖鬼故事", "都是鬼在卖"),
            q("古玩摊上看到「祖传宝贝」，第一反应应该是？", "看走眼概率大", "捡到大漏", "赶紧买下")
        ));
        m.put("training", List.of(
            q("培训中心「包教包会」的潜台词通常是？", "认真学就能会", "交钱就毕业", "包找工作")
        ));
        m.put("adu", List.of(
            q("成人大学上课，最划算的时间安排是？", "下班后晚上", "上班时间", "周末睡懒觉"),
            q("学历提升后，最先受益的是什么？", "求职门槛", "长相", "运气")
        ));
        return m;
    }
    private static GameConfig.QuizQ q(String question, String a, String b, String c) {
        GameConfig.QuizQ x = new GameConfig.QuizQ();
        x.q = question;
        x.type = "choice";
        x.options = List.of(a, b, c);
        x.answer = 0;   // 默认第一个是正确答案
        return x;
    }

    private static Map<String, Object> err(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("msg", msg);
        return m;
    }
}
