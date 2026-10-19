package com.cityworker.sim.service;

import com.cityworker.sim.model.CharacterModel;
import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 职业系统：找工作 / 入职 / 辞职 / 打工 / 捡废品 / 摆摊 */
public final class JobActions {

    private JobActions() {}

    public static void jobs(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"jobmarket".equals(s.locationId)) {
            out.add(Ansi.red("你不在人才市场。输入 move 人才市场 先去招聘大厅。"));
            return;
        }
        out.add(Ansi.banner("人才市场 · 招聘信息", "JOBS"));
        List<GameConfig.JobDef> jobs = gs.cfg().jobs;
        for (int i = 0; i < jobs.size(); i++) {
            GameConfig.JobDef j = jobs.get(i);
            String tag = "special".equals(j.type) ? Ansi.gold("【特殊】") : Ansi.gray("【普通】");
            out.add(Ansi.cyan((i + 1) + ". ") + tag + Ansi.bold(j.name)
                    + Ansi.gray("  日薪 " + j.daily + " 元（时薪 " + Math.round(j.daily / 8.0) + "）"));
            List<String> req = new java.util.ArrayList<>();
            if (j.minEducation != null && !j.minEducation.isBlank()) req.add("学历≥" + eduName(gs, j.minEducation));
            if (j.minStr > 0) req.add("体力≥" + j.minStr);
            if (j.minIntel > 0) req.add("智力≥" + j.minIntel);
            if (j.minCharm > 0) req.add("魅力≥" + j.minCharm);
            if (j.minPrestige > 0) req.add("声望≥" + j.minPrestige);
            if (j.requiredCertificate != null) req.add("证书：" + certName(gs, j.requiredCertificate));
            if (j.requiredCerts != null && !j.requiredCerts.isEmpty()) {
                StringBuilder cb = new StringBuilder("证书：");
                for (int k = 0; k < j.requiredCerts.size(); k++) {
                    if (k > 0) cb.append(" + ");
                    cb.append(certName(gs, j.requiredCerts.get(k)));
                }
                req.add(cb.toString());
            }
            if (j.requiredOutfit != null) req.add("着装：" + itemName(gs, j.requiredOutfit));
            if (j.transportBonus > 0) req.add("有车更赚");
            out.add(Ansi.darkGray("　　" + j.desc + (req.isEmpty() ? "" : " ｜ 要求：" + String.join("、", req))));
        }
        out.add("");
        out.add(Ansi.yellow("输入 sign <编号> 入职（如 sign 3）"));
    }

    public static void sign(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"jobmarket".equals(s.locationId)) {
            out.add(Ansi.red("请先到人才市场再投简历（move 人才市场）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：sign <编号>，先输入 jobs 查看岗位"));
            return;
        }
        int idx = GameService.parseInt(args[0], -1) - 1;
        GameConfig.JobDef job = resolveJob(gs, args[0]);
        if (job == null) {
            out.add(Ansi.red("没有这个岗位，输入 jobs 查看。"));
            return;
        }
        if (s.jobId != null && s.jobId.equals(job.id)) {
            out.add(Ansi.yellow("你已经在做这份工作了。"));
            return;
        }
        if (s.jobId != null) {
            out.add(Ansi.red("你现在有工作（" + gs.jobName(gs.cfg(), s.jobId) + "），先 resign 辞职再换。"));
            return;
        }
        String fail = checkJobReqs(gs, job);
        if (fail != null) {
            out.add(Ansi.red("✘ 不符合入职要求：" + fail));
            out.add(Ansi.gray("提示：缺属性练不上去就换条路；缺服装去商场 shop 买；缺证书去培训中心 train 考。"));
            return;
        }
        s.jobId = job.id;
        s.jobCount++;
        out.add(Ansi.green("🎉 入职成功！你成为了一名" + Ansi.bold(job.name) + "。"));
        out.add(Ansi.gray("　明天开始上班（去 工作地点 输入 work 打工）。"));
        if (job.requiredCertificate != null) {
            out.add(Ansi.gray("　你的" + certName(gs, job.requiredCertificate) + "派上了用场。"));
        }
    }

    /** 工作小游戏结算：score 0-100 完成度 → 报酬加成（UI 弹窗调用） */
    public static void workFinish(GameService gs, List<String> out, int score) {
        GameState s = gs.state();
        if (s.jobId == null) { out.add(Ansi.red("你还没工作，先去人才市场 jobs 看看。")); return; }
        if (!"workplace".equals(s.locationId)) { out.add(Ansi.red("你现在不在工作地点。输入 move 工作地点 去上班。")); return; }
        GameConfig.JobDef job = gs.curJob();
        if (s.character.stamina <= 0) { out.add(Ansi.red("你实在太累了，先吃点东西或睡一觉吧。")); return; }
        score = Math.max(0, Math.min(100, score));

        int want = 8;
        int totalCost = job.staminaPerHour * want;
        int hours = totalCost > s.character.stamina ? Math.max(1, s.character.stamina / Math.max(1, job.staminaPerHour)) : want;

        int hourly = Math.round(job.daily / 8f);
        int normal = Math.min(8, hours);
        int overtime = Math.max(0, hours - 8);
        double moodFactor = s.character.mood >= 60 ? 1.0 : (s.character.mood >= 30 ? 0.85 : 0.6);
        double workBonus = 1 + gs.personalityWorkBonus();
        double transport = job.transportBonus > 0 ? (1 + gs.transportBonus()) : 1.0;
        double refer = 1 + s.referBonus;
        double perf = 0.6 + score * 0.006;   // 完成度加成：0分 60%，100分 120%
        int income = (int) Math.round(hourly * normal * moodFactor * workBonus * transport * refer * perf);
        if (overtime > 0) {
            income += (int) Math.round(hourly * overtime * 1.5 * moodFactor * workBonus * transport * refer * perf);
        }
        if (s.referBonus > 0 && hours >= 8) {
            out.add(Ansi.yellow("　💼 刘哥的介绍起了作用：本次薪资 +" + Math.round(s.referBonus * 100) + "%"));
            s.referBonus = 0;
        }
        int commission = 0;
        if ("sales".equals(job.id)) {
            commission = (int) Math.round(gs.gearCharm() * 1.5 * hours / 8.0);
            income += commission;
        }
        s.character.money += income;
        s.totalEarned += income;
        s.character.stamina = Math.max(0, s.character.stamina - job.staminaPerHour * hours);
        gs.changeHunger(-4 * hours);
        gs.changeMood(-2 * hours);

        // 工作积累成长
        s.workGrowCount++;
        String growAttr = job.growAttr;
        if (growAttr != null && s.workGrowCount % 2 == 0) {
            CharacterModel ch = s.character;
            if ("str".equals(growAttr) && ch.str < 90) ch.str++;
            else if ("intel".equals(growAttr) && ch.intel < 90) ch.intel++;
            else if ("charm".equals(growAttr) && ch.charm < 90) ch.charm++;
        }

        String grade = score >= 90 ? "完美" : score >= 70 ? "优秀" : score >= 50 ? "合格" : score >= 30 ? "勉强" : "摸鱼";
        out.add(Ansi.banner("收工结账", grade + " · 完成度 " + score + "%"));
        out.add(Ansi.gray("　你在" + job.name + "的岗位上干了 " + hours + " 小时" + (score >= 90 ? "，老板连连称赞" : score >= 50 ? "，中规中矩" : "，被工头说了几句") + "。"));
        out.add(Ansi.green("　💰 今日工资 +" + income + " 元" + (score >= 100 ? "（满勤奖金！）" : "") + (commission > 0 ? "（含提成 " + commission + "）" : "")));
        if (perf > 1.05) out.add(Ansi.gold("　⭐ 高质量完成，额外加成 " + Math.round((perf - 1) * 100) + "%"));
        gs.pushState();
    }

    public static void resign(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (s.jobId == null) {
            out.add(Ansi.yellow("你本来就没工作。"));
            return;
        }
        String name = gs.jobName(gs.cfg(), s.jobId);
        s.jobId = null;
        out.add(Ansi.gray("你把工牌还了回去，正式辞掉了" + name + "的工作。"));
        out.add(Ansi.gray("口袋空空的你，又站在了人生的十字路口。"));
    }

    public static void work(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (s.jobId == null) {
            out.add(Ansi.red("你还没工作，先去人才市场 jobs 看看。"));
            return;
        }
        if (!"workplace".equals(s.locationId)) {
            out.add(Ansi.red("你现在不在工作地点。输入 move 工作地点 去上班。"));
            return;
        }
        GameConfig.JobDef job = gs.curJob();
        int want = args.length > 0 ? GameService.parseInt(args[0], 8) : 8;
        want = Math.max(1, Math.min(12, want));

        int totalCost = job.staminaPerHour * want;
        if (s.character.stamina <= 0) {
            out.add(Ansi.red("你实在太累了，一站起来就头晕。先吃点东西或睡一觉吧。"));
            return;
        }
        int hours = totalCost > s.character.stamina ? Math.max(1, s.character.stamina / Math.max(1, job.staminaPerHour)) : want;
        hours = Math.min(hours, want);
        if (hours <= 0) hours = 1;

        int hourly = Math.round(job.daily / 8f);
        int normal = Math.min(8, hours);
        int overtime = Math.max(0, hours - 8);
        double moodFactor = s.character.mood >= 60 ? 1.0 : (s.character.mood >= 30 ? 0.85 : 0.6);
        double workBonus = 1 + gs.personalityWorkBonus();
        double transport = job.transportBonus > 0 ? (1 + gs.transportBonus()) : 1.0;
        double refer = 1 + s.referBonus;   // 中介刘哥推荐加成
        int income = (int) Math.round(hourly * normal * moodFactor * workBonus * transport * refer);
        if (overtime > 0) {
            income += (int) Math.round(hourly * overtime * 1.5 * moodFactor * workBonus * transport * refer);
        }
        if (s.referBonus > 0 && hours >= 8) {
            out.add(Ansi.yellow("　💼 刘哥的介绍起了作用：本次薪资 +" + Math.round(s.referBonus * 100) + "%"));
            s.referBonus = 0;
        }
        // 售楼提成
        int commission = 0;
        if ("sales".equals(job.id)) {
            commission = (int) Math.round(gs.gearCharm() * 1.5 * hours / 8.0);
            income += commission;
        }

        s.character.money += income;
        s.totalEarned += income;
        s.character.stamina = Math.max(0, s.character.stamina - job.staminaPerHour * hours);
        gs.changeHunger(-4 * hours);
        gs.changeMood(-2 * hours);

        // 工作积累：每工作 2 天，按职业类型提升一次主属性（上限 90）
        s.workGrowCount++;
        String growAttr = job.growAttr;
        if (growAttr != null && s.workGrowCount % 2 == 0) {
            CharacterModel ch = s.character;
            String label;
            int before;
            boolean grown;
            if ("str".equals(growAttr) && ch.str < 90) { before = ch.str; ch.str++; label = "💪 体力"; grown = true; }
            else if ("intel".equals(growAttr) && ch.intel < 90) { before = ch.intel; ch.intel++; label = "🧠 智力"; grown = true; }
            else if ("charm".equals(growAttr) && ch.charm < 90) { before = ch.charm; ch.charm++; label = "✨ 魅力"; grown = true; }
            else if ("luck".equals(growAttr) && ch.luck < 90) { before = ch.luck; ch.luck++; label = "🍀 运气"; grown = true; }
            else { label = null; before = 0; grown = false; }
            if (grown) {
                out.add(Ansi.gray("　📈 干「" + job.name + "」的日子让你越干越精：" + label + " +1（" + before + " → " + (before + 1) + "）"));
            }
        }

        gs.advanceTime(hours * 60);

        out.add(Ansi.banner("打工中", job.name + " · " + hours + " 小时"));
        out.add(Ansi.gray("　时薪 " + hourly + " 元 × " + hours + "h"
                + (hours != want ? Ansi.yellow("（体力不足，只干了" + hours + "小时）") : "")));
        if (overtime > 0) out.add(Ansi.orange("　加班 " + overtime + " 小时（1.5倍）"));
        if (moodFactor < 1) out.add(Ansi.gray("　心情不佳，效率打 " + (int) (moodFactor * 100) + " 折"));
        if (commission > 0) out.add(Ansi.cyan("　销售提成 +" + commission + " 元"));
        out.add(Ansi.green("　💰 到手 " + income + " 元（累计收入 " + s.totalEarned + " 元）"));
        if (gs.rnd().nextInt(10) == 0) {
            gs.changeMood(3);
            out.add(Ansi.yellow("　老板难得夸了你一句，心情 +3"));
        }
        if (s.character.stamina < 20) {
            out.add(Ansi.red("　⚠ 体力告急！再干下去要进医院了。"));
        }
    }

    public static void scrap(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("捡废品要去大街（move 大街）"));
            return;
        }
        gs.advanceTime(30);
        gs.changeStamina(-4);
        gs.changeHunger(-3);
        s.scrapCount++;
        int gain = 6 + gs.rnd().nextInt(13);
        gain = (int) Math.round(gain * (1 + s.character.luck * 0.015));
        double roll = gs.rnd().nextDouble();
        String find;
        if (roll < 0.008) {
            int big = 300 + gs.rnd().nextInt(500);
            gain += big;
            find = "你在一堆旧书里翻出一张泛黄的邮票，卖给收废品大爷换了 " + big + " 元！";
        } else if (roll < 0.09) {
            int mid = 50 + gs.rnd().nextInt(100);
            gain += mid;
            find = "捡到半箱还能用的旧家电，卖了 " + mid + " 元！";
        } else {
            find = switch (gs.rnd().nextInt(4)) {
                case 0 -> "翻出几个饮料瓶和纸箱，卖了点钱。";
                case 1 -> "在垃圾桶边捡到一摞废报纸，称重换钱。";
                default -> "今天废品价还行，小赚一笔。";
            };
        }
        s.character.money += gain;
        out.add(Ansi.cyan("🗑️ 你翻了翻垃圾桶……"));
        out.add(Ansi.gray("　" + find));
        out.add(Ansi.green("　💰 +" + gain + " 元（第 " + s.scrapCount + " 次拾荒）"));
        if (gs.rnd().nextInt(5) == 0) gs.changeMood(1);
    }

    public static void stall(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) {
            out.add(Ansi.red("摆摊得去大街（move 大街）"));
            return;
        }
        if (s.character.money < 50) {
            out.add(Ansi.red("进货钱都没有（需要50元），先去打工或捡废品吧。"));
            return;
        }
        s.character.money -= 50;
        gs.advanceTime(120);
        gs.changeStamina(-5);
        gs.changeHunger(-4);
        double profit = 20 + gs.gearCharm() * 1.5 + gs.rnd().nextInt(31);
        if (gs.rnd().nextDouble() < 0.15 - s.character.luck * 0.002) {
            int fine = 30 + gs.rnd().nextInt(70);
            s.character.money -= fine;
            gs.changeMood(-10);
            out.add(Ansi.red("🚨 城管来了！货摊被没收，罚款 " + fine + " 元，心情-10。"));
            return;
        }
        int earned = (int) Math.round(profit);
        s.character.money += earned;
        gs.changeMood(3);
        out.add(Ansi.cyan("🏪 你支起小摊，吆喝了两小时……"));
        out.add(Ansi.green("　💰 净赚 " + earned + " 元（进货50元已扣）"));
        if (gs.rnd().nextDouble() < 0.2 + s.character.luck * 0.005) {
            out.add(Ansi.gold("　✨ 今天生意出奇的好，被大妈们围得水泄不通！"));
        }
    }

    // ============ 内部工具 ============

    static GameConfig.JobDef resolveJob(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().jobs.size()) {
            return gs.cfg().jobs.get(idx - 1);
        }
        return gs.cfg().jobs.stream().filter(j -> j.id.equals(arg)).findFirst().orElse(null);
    }

    static String checkJobReqs(GameService gs, GameConfig.JobDef job) {
        GameState s = gs.state();
        if (job.minEducation != null && !job.minEducation.isBlank()
                && GameConfig.educationRank(s.character.educationId) < GameConfig.educationRank(job.minEducation)) {
            return "学历不足：当前" + eduName(gs, s.character.educationId)
                    + "，需要≥" + eduName(gs, job.minEducation) + "（去成人大学 college 提升学历）";
        }
        if (s.character.str < job.minStr) return "体力(力量)不足：当前 " + s.character.str + "，需要 ≥" + job.minStr;
        if (s.character.intel < job.minIntel) return "智力不足：当前 " + s.character.intel + "，需要 ≥" + job.minIntel;
        if (gs.gearCharm() < job.minCharm)
            return "魅力不足：当前 " + gs.gearCharm() + "，需要 ≥" + job.minCharm + "（穿戴更贵的衣服饰品可提升）";
        if (gs.gearPrestige() < job.minPrestige)
            return "声望不足：当前 " + gs.gearPrestige() + "，需要 ≥" + job.minPrestige + "（穿戴手表西装可提升）";
        if (job.requiredCertificate != null && !s.certificates.contains(job.requiredCertificate)) {
            return "需要「" + certName(gs, job.requiredCertificate) + "」（去培训中心考取）";
        }
        if (job.requiredCerts != null) {
            for (String cid : job.requiredCerts) {
                if (!s.certificates.contains(cid)) {
                    return "需要「" + certName(gs, cid) + "」等" + job.requiredCerts.size() + "张证书叠加（去培训中心逐科考取）";
                }
            }
        }
        if (job.requiredOutfit != null && !s.equipped.contains(job.requiredOutfit)) {
            return "需要穿戴「" + itemName(gs, job.requiredOutfit) + "」（买了记得 wear 穿上，bag 可查看）";
        }
        return null;
    }

    static String certName(GameService gs, String certId) {
        if (certId == null) return "";
        return gs.cfg().courses.stream().filter(c -> certId.equals(c.certId))
                .findFirst().map(c -> c.certName).orElse(certId);
    }

    static String itemName(GameService gs, String itemId) {
        if (itemId == null) return "";
        return gs.cfg().mall.stream().filter(m -> itemId.equals(m.id))
                .findFirst().map(m -> m.name).orElse(itemId);
    }

    static String eduName(GameService gs, String id) {
        if (id == null) return "";
        return gs.cfg().education.stream().filter(e -> id.equals(e.id))
                .findFirst().map(e -> e.name).orElse(id);
    }
}
