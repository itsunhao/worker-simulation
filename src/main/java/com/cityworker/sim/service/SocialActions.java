package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/** 社交系统：大街陌生人 / 同事 / 恋爱 / 结婚 */
public final class SocialActions {

    private SocialActions() {}

    public static void social(GameService gs, List<String> out) {
        GameState s = gs.state();
        List<NPC> socials = s.npcs.stream().filter(n -> !n.isFixed).toList();
        if (socials.isEmpty()) {
            out.add(Ansi.gray("身边冷冷清清的，一个人都不认识。"));
            out.add(Ansi.gray("　去大街（move 大街）多转转，或找份工作认识点同事吧。"));
            return;
        }
        out.add(Ansi.banner("附近的人", "SOCIAL"));
        for (int i = 0; i < socials.size(); i++) {
            NPC n = socials.get(i);
            String rel = gs.relationName(n.relation);
            String relColor = switch (n.relation) {
                case "SPOUSE" -> Ansi.gold("❤ " + rel);
                case "LOVER", "FIANCEE" -> Ansi.pink("💗 " + rel);
                case "CRUSH" -> Ansi.magenta("💘 " + rel);
                case "FRIEND" -> Ansi.cyan("🤝 " + rel);
                default -> Ansi.gray("　" + rel);
            };
            String src = "work".equals(n.source) ? "（同事）" : "（街头）";
            out.add(Ansi.cyan((i + 1) + ". ") + (n.isPartner ? Ansi.bold("★ ") : "")
                    + Ansi.bold(n.name) + src
                    + Ansi.gray(" " + n.genderEmoji() + n.age + "岁·" + n.profession + "·" + n.personality)
                    + "  " + relColor + Ansi.gray(" 好感" + n.affection + "/100"));
        }
        out.add("");
        out.add(Ansi.yellow("互动：talk <编号> 聊天（免费）｜treat <编号> 请客（50元）｜gift <编号> 送礼（60-120元）"));
        out.add(Ansi.yellow("v2.0：帮忙 <编号> 帮个忙涨好感｜borrow <编号> <金额> 借钱｜learn <编号> 请教涨智力｜gossip <编号> 聊知心话"));
        out.add(Ansi.yellow("关系：好感≥60 可 confess 表白；好感≥90 可 propose 求婚"));
        out.add(Ansi.gray("　　好感30成为朋友，50进入暧昧，60表白确定恋爱，85+可以谈婚论嫁。"));
    }

    public static void talk(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (gs.state().character.money == 0 && gs.rnd().nextBoolean()) {
            out.add(Ansi.gray("你摸了摸空空的口袋，聊天都没底气……"));
        }
        // ---- v2.2 话题系统：talk <编号> <话题> ----
        String topic = args.length > 1 ? args[1] : "";
        int att = attitudeRank(gs);
        int gain = 3 + gs.rnd().nextInt(5) + (int) (gs.gearCharm() * 0.06);
        gain = (int) (gain * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        if (att >= 3) gain = (int) (gain * 1.3);
        else if (att == 0) gain = Math.max(1, gain - 2);
        gainAffection(gs, n, gain);
        gs.changeMood(1);
        gs.advanceTime(15);
        n.lastInteractDay = gs.state().day();
        String attPrefix = attitudePrefix(att);
        String line;
        if (!topic.isEmpty()) {
            String tp = matchTopic(topic);
            if (tp == null) {
                out.add(Ansi.yellow("话题可选：家乡 / 工作 / 美食 / 理财 / 人生 / 八卦（如 talk <编号> 美食）"));
                tp = "生活";
            }
            line = topicLine(gs, n, tp, att);
            out.add(Ansi.cyan("💬 你和" + n.name + "聊起了「" + tp + "」。"));
            out.add(Ansi.gray("　" + attPrefix + line));
        } else {
            line = switch (gs.rnd().nextInt(5)) {
                case 0 -> "你们聊起了家乡和梦想，气氛不错。";
                case 1 -> n.name + "讲了个段子，你们笑作一团。";
                case 2 -> "你们吐槽了各自的老板，同仇敌忾。";
                case 3 -> "聊到好吃的，你们约好改天一起去美食街。";
                default -> "有一搭没一搭地聊着，时间过得很快。";
            };
            out.add(Ansi.cyan("💬 你和" + n.name + "聊了15分钟。"));
            out.add(Ansi.gray("　" + line));
        }
        out.add(Ansi.green("　好感 +" + gain + "（当前 " + n.affection + "/100）" + (att == 3 ? "，对方对你毕恭毕敬" : att == 0 ? "，对方有点爱答不理" : "")));
    }

    // ============ v2.2 话题与态度系统 ============

    /** 玩家社会地位：0轻慢 1平淡 2客气 3尊崇（学历+职业+存款+资产综合） */
    public static int attitudeRank(GameService gs) {
        GameState s = gs.state();
        int score = 0;
        // 学历
        score += switch (GameConfig.educationRank(s.character.educationId)) {
            case 3 -> 3; case 2 -> 2; case 1 -> 1; default -> 0;
        };
        // 职业
        if (s.bizId != null) score += 3;
        else if (s.jobId != null) {
            GameConfig.JobDef j = gs.cfg().jobs.stream().filter(x -> x.id.equals(s.jobId)).findFirst().orElse(null);
            score += (j != null && "special".equals(j.type)) ? 2 : 1;
        }
        // 存款
        if (s.character.deposit >= 1_000_000) score += 3;
        else if (s.character.deposit >= 100_000) score += 2;
        else if (s.character.deposit >= 10_000) score += 1;
        // 资产
        if (!s.ownedEstates.isEmpty()) score += 1;
        if (!s.ownedCars.isEmpty()) {
            GameConfig.CarDef best = CarActions.bestCar(gs);
            if (best != null && best.cost >= 100000) score += 1;
        }
        if (score >= 7) return 3;
        if (score >= 5) return 2;
        if (score >= 3) return 1;
        return 0;
    }

    public static String attitudeName(int rank) {
        return switch (rank) { case 0 -> "轻慢"; case 1 -> "平淡"; case 2 -> "客气"; default -> "尊崇"; };
    }

    private static String attitudePrefix(int rank) {
        return switch (rank) {
            case 0 -> "「穷得叮当响还来搭话……」" + "对方爱答不理。";
            case 1 -> "对方随口应着。";
            case 2 -> "对方客客气气地应着。";
            default -> "「哎哟，您来啦！」对方一改神色，毕恭毕敬。";
        };
    }

    private static String matchTopic(String raw) {
        String t = raw.toLowerCase();
        if (t.contains("家") || t.contains("乡")) return "家乡";
        if (t.contains("工") || t.contains("职") || t.contains("班")) return "工作";
        if (t.contains("食") || t.contains("吃") || t.contains("饭")) return "美食";
        if (t.contains("理") || t.contains("钱") || t.contains("财") || t.contains("股")) return "理财";
        if (t.contains("人") || t.contains("生") || t.contains("梦")) return "人生";
        if (t.contains("八") || t.contains("卦") || t.contains("料")) return "八卦";
        return null;
    }

    /** 按性别 × 话题 × 态度出对话（内容库） */
    private static String topicLine(GameService gs, NPC n, String topic, int att) {
        boolean female = "female".equals(n.gender);
        int r = gs.rnd().nextInt(4);
        String[] pool;
        if (female) {
            pool = switch (topic) {
                case "家乡" -> new String[]{
                    n.name + "说起老家的桂花糕，咽了咽口水：「我妈做的最好吃。」",
                    n.name + "提到家里的弟弟妹妹，说想攒钱寄回去。",
                    n.name + "讲起村里赶集的热闹，眼里有点怀念。",
                    "「城里高楼多，可我还是想屋后的那片稻田。」" + n.name + "轻声说。"};
                case "工作" -> new String[]{
                    n.name + "抱怨今天站了一整天柜台，腿都麻了。",
                    n.name + "说起老板画的饼，翻了个白眼：「也就听听。」",
                    n.name + "说想攒够钱开个自己的小店。",
                    "「这行干久了，见的人多了，也就习惯了。」" + n.name + "叹道。"};
                case "美食" -> new String[]{
                    n.name + "安利了街角那家麻辣烫：「辣得够劲，回头客特别多。」",
                    n.name + "说改天要请你去吃她/他拿手的红烧肉。",
                    n.name + "吐槽公司食堂的菜「猪都不吃」。",
                    "「火锅一定要配冰可乐，不然没灵魂。」" + n.name + "认真地说。"};
                case "理财" -> new String[]{
                    n.name + "说每个月发了工资先存一半，剩下的才敢花。",
                    n.name + "问你有没有什么稳妥的理财路子。",
                    n.name + "讲起自己买基金被套牢的经历，直摇头。",
                    "「钱这东西，存着是死，花了是活，难就难在分寸。」" + n.name + "感慨。"};
                case "人生" -> new String[]{
                    n.name + "说刚来这座城市时，连落脚的地方都没有。",
                    n.name + "聊起「以后想过的日子」，眼神亮了一下。",
                    n.name + "说人这一辈子，能踏实睡个好觉就不容易。",
                    "「年轻的时候觉得日子很长，现在觉得一晃就到头了。」" + n.name + "说。"};
                case "八卦" -> new String[]{
                    n.name + "压低声音说楼上的小两口又吵架了。",
                    n.name + "讲起街角奶茶店小哥天天换女朋友，啧啧称奇。",
                    n.name + "说菜市场王婶的女儿考上研究生了，人人羡慕。",
                    "「我跟你说，你可别告诉别人啊……」" + n.name + "神秘兮兮地说。"};
                default -> new String[]{
                    n.name + "跟你有一搭没一搭地聊着，气氛随意。",
                    n.name + "想起什么好笑的事，自己先笑了。"};
            };
        } else {
            pool = switch (topic) {
                case "家乡" -> new String[]{
                    n.name + "说起老家那口老井，说夏天打上来的水都是甜的。",
                    n.name + "提到想攒钱把老家的房子翻新一下。",
                    n.name + "讲起小时候爬树掏鸟窝的糗事。",
                    "「在外头打拼这些年，回去的路倒是越来越熟了。」" + n.name + "笑道。"};
                case "工作" -> new String[]{
                    n.name + "吐槽客户难缠，血压都高了。",
                    n.name + "说起想换个行业试试水。",
                    n.name + "说上个月加了几天班，工资条看着还行。",
                    "「干我们这行的，赚的就是辛苦钱。」" + n.name + "抹了把汗。"};
                case "美食" -> new String[]{
                    n.name + "说他老家的大排档，凌晨三点还人声鼎沸。",
                    n.name + "推荐了夜市那家烤串：「老板实在，肉给得足。」",
                    n.name + "说会做一手好菜，改天露两手。",
                    "「饿不饿？我知道家面馆，味道正。」" + n.name + "眼睛一亮。"};
                case "理财" -> new String[]{
                    n.name + "说股票水深，劝你别碰不懂的东西。",
                    n.name + "讲起自己存钱买房的血泪史。",
                    n.name + "说现在每月雷打不动定投一点。",
                    "「穷的时候别乱花，富的时候别乱投。」" + n.name + "老成地说。"};
                case "人生" -> new String[]{
                    n.name + "说当年一个人扛着行李南下，现在也算扎下根了。",
                    n.name + "聊起想带爸妈来城里看看。",
                    n.name + "说人活着就图个踏实，钱多钱少都是过。",
                    "「日子是自己过出来的，跟别人比没意思。」" + n.name + "说。"};
                case "八卦" -> new String[]{
                    n.name + "说会所门口那辆豪车，天天换司机。",
                    n.name + "讲起彩票站老赵中了奖又赔回去的奇闻。",
                    n.name + "说最近街角开了家密室逃脱，生意火爆。",
                    "「你猜怎么着？我昨天看见……」" + n.name + "压低嗓门。"};
                default -> new String[]{
                    n.name + "跟你随口聊着，语气轻松。",
                    n.name + "递了根烟过来：「来一根不？」（你摆了摆手）"};
            };
        }
        return pool[r];
    }

    public static void treat(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        int cost = 50;
        if (gs.state().character.money < cost) {
            out.add(Ansi.red("请客要 " + cost + " 元，你掏不出这个钱……"));
            return;
        }
        gs.state().character.money -= cost;
        int gain = 8 + gs.rnd().nextInt(6) + (int) (gs.gearCharm() * 0.08);
        gain = (int) (gain * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        gainAffection(gs, n, gain);
        gs.changeHunger(25);
        gs.changeMood(3);
        gs.advanceTime(45);
        n.lastInteractDay = gs.state().day();
        out.add(Ansi.cyan("🍜 你请" + n.name + "吃了顿饭（" + cost + "元）。"));
        out.add(Ansi.gray("　" + n.name + "吃得很开心，你们的关系更近了。"));
        out.add(Ansi.green("　好感 +" + gain + "（当前 " + n.affection + "/100），饱腹+25"));
    }

    public static void gift(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        int cost = 60 + gs.rnd().nextInt(61);
        if (gs.state().character.money < cost) {
            out.add(Ansi.red("买礼物要 " + cost + " 元，你摸了摸口袋……"));
            return;
        }
        gs.state().character.money -= cost;
        int gain = 10 + gs.rnd().nextInt(8) + (int) (gs.gearCharm() * 0.1);
        gain = (int) (gain * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        gainAffection(gs, n, gain);
        gs.changeMood(2);
        gs.advanceTime(15);
        n.lastInteractDay = gs.state().day();
        String gift = switch (gs.rnd().nextInt(6)) {
            case 0 -> "一支护手霜";
            case 1 -> "一盒小蛋糕";
            case 2 -> "一个暖手宝";
            case 3 -> "一条围巾";
            case 4 -> "一束花";
            default -> "一对可爱的钥匙扣";
        };
        out.add(Ansi.pink("🎁 你送了" + n.name + "" + gift + "（" + cost + "元）。"));
        out.add(Ansi.gray("　" + n.name + "眼睛亮了，笑着收下了。"));
        out.add(Ansi.green("　好感 +" + gain + "（当前 " + n.affection + "/100）"));
    }

    public static void confess(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (n.isPartner && ("LOVER".equals(n.relation) || "FIANCEE".equals(n.relation) || "SPOUSE".equals(n.relation))) {
            out.add(Ansi.yellow("你们已经是" + gs.relationName(n.relation) + "了，不用再表白。"));
            return;
        }
        if (n.affection < 60) {
            out.add(Ansi.red("好感度不够（" + n.affection + "/100，需要≥60）。多聊聊、请请客吧。"));
            return;
        }
        double success = 0.55 + n.affection / 200.0 + gs.gearCharm() * 0.003;
        success = Math.min(0.95, success * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        gs.advanceTime(30);
        out.add(Ansi.pink("💘 你鼓起勇气，对" + n.name + "说出了心里话……"));
        if (gs.rnd().nextDouble() < success) {
            n.relation = "LOVER";
            n.isPartner = true;
            gs.state().partnerId = n.id;
            gs.changePrestige(10);
            gs.changeMood(15);
            out.add(Ansi.gold("🎉 她/他红着脸答应了！你们成为了恋人！"));
            out.add(Ansi.gray("　声望+10，心情+15。继续培养感情，好感≥90 可以求婚（propose）。"));
        } else {
            n.affection = Math.max(0, n.affection - 5);
            gs.changeMood(-5);
            out.add(Ansi.red("　" + n.name + "愣了一下，说『我们还是先做朋友吧』……"));
            out.add(Ansi.gray("　好感-5，别灰心，慢慢来。"));
        }
        n.lastInteractDay = gs.state().day();
    }

    public static void propose(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!n.isPartner || !("LOVER".equals(n.relation) || "FIANCEE".equals(n.relation))) {
            out.add(Ansi.red("只有恋人/未婚伴侣才能求婚（先 confess 表白成功）。"));
            return;
        }
        if (n.affection < 90) {
            out.add(Ansi.red("好感度还不够（" + n.affection + "/100，需要≥90）。"));
            return;
        }
        int cost = 2000;
        if (gs.state().character.money < cost) {
            out.add(Ansi.red("求婚要准备戒指和酒席（" + cost + " 元），你还没这个实力。"));
            return;
        }
        double success = 0.5 + n.affection / 200.0 + (gs.state().ownedEstates.isEmpty() ? -0.1 : 0.15);
        success = Math.min(0.95, Math.max(0.2, success));
        gs.state().character.money -= cost;
        gs.advanceTime(60);
        out.add(Ansi.gold("💍 你单膝跪地，掏出戒指，对" + n.name + "求婚……"));
        if (gs.rnd().nextDouble() < success) {
            n.relation = "SPOUSE";
            gs.state().married = true;
            gs.state().marriedDay = gs.state().day();
            gs.changePrestige(30);
            gs.changeMood(20);
            out.add(Ansi.gold("🎊「我愿意！」——你们结婚了！"));
            out.add(Ansi.gray("　声望+30，心情+20。漂泊的城里，终于有人等你回家。"));
        } else {
            n.affection = Math.max(0, n.affection - 5);
            gs.changeMood(-8);
            out.add(Ansi.red("　" + n.name + "哭了：『太突然了……再给我点时间。』"));
            out.add(Ansi.gray("　好感-5。也许该先把日子过稳（买房买车），再谈终身大事。"));
        }
        n.lastInteractDay = gs.state().day();
    }

    public static void divorce(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!n.isPartner || !"SPOUSE".equals(n.relation)) {
            out.add(Ansi.red("你们不是夫妻关系，谈不上离婚。"));
            return;
        }
        int cost = 500;
        if (gs.state().character.money < cost) {
            out.add(Ansi.red("离婚冷静期+手续要 " + cost + " 元，先攒攒钱。"));
            return;
        }
        gs.state().character.money -= cost;
        n.relation = "STRANGER";
        n.affection = 0;
        n.isPartner = false;
        gs.state().partnerId = null;
        gs.state().married = false;
        gs.state().marriedDay = -1;
        gs.changePrestige(-10);
        gs.changeMood(-15);
        gs.advanceTime(30);
        out.add(Ansi.red("📄 你们平静地签了离婚协议，办完手续花掉 " + cost + " 元。"));
        out.add(Ansi.gray("　从此一别两宽，各生欢喜。好感清零，声望 -10，心情 -15。"));
    }

    // ============ v2.0 NPC 深度互动 ============

    /** 帮 NPC 个忙：好感大涨，可能收到谢礼/红包 */
    public static void help(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        GameState s = gs.state();
        int gain = 6 + gs.rnd().nextInt(6) + (int) (gs.gearCharm() * 0.07);
        gain = (int) (gain * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        gainAffection(gs, n, gain);
        gs.changeMood(2);
        gs.advanceTime(30);
        s.npcHelpCount++;
        n.lastInteractDay = s.day();
        String deed = switch (gs.rnd().nextInt(6)) {
            case 0 -> "帮" + n.name + "搬了一趟家，累得够呛";
            case 1 -> "陪" + n.name + "去医院挂号取药";
            case 2 -> "帮" + n.name + "修好了漏水的龙头";
            case 3 -> "帮" + n.name + "跑了趟腿买齐生活用品";
            case 4 -> "帮" + n.name + "排队抢到了限量款";
            default -> "帮" + n.name + "辅导了一会儿手机操作";
        };
        out.add(Ansi.cyan("🤝 你" + deed + "。"));
        out.add(Ansi.gray("　" + n.name + "连声道谢，看你的眼神都温柔了。"));
        out.add(Ansi.green("　好感 +" + gain + "（当前 " + n.affection + "/100），心情+2"));
        // 小概率收到谢礼
        double roll = gs.rnd().nextDouble();
        if (roll < 0.2 && n.affection >= 30) {
            int reward = 10 + gs.rnd().nextInt(40);
            s.character.money += reward;
            out.add(Ansi.gold("　🎁 " + n.name + "非要塞给你" + reward + "元红包当谢礼！"));
        } else if (roll < 0.3) {
            gs.changeMood(2);
            out.add(Ansi.yellow("　🍜 " + n.name + "请你吃了碗热腾腾的馄饨，心情+2，饱腹+10。"));
            gs.changeHunger(10);
        }
    }

    /** 向 NPC 借钱：好感越高越容易，借了要还（borrow <编号> repay） */
    public static void borrow(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        GameState s = gs.state();
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：borrow <编号> <金额> 借钱，borrow <编号> repay 还钱"));
            return;
        }
        if ("repay".equals(args[1].toLowerCase()) || "还".equals(args[1])) {
            int debt = s.npcDebt.getOrDefault(n.id, 0);
            if (debt <= 0) {
                out.add(Ansi.gray("你没欠" + n.name + "的钱。"));
                return;
            }
            if (s.character.money < debt) {
                out.add(Ansi.red("还清需要 " + debt + " 元，你手头不够。"));
                return;
            }
            s.character.money -= debt;
            s.npcDebt.remove(n.id);
            gainAffection(gs, n, 8);
            out.add(Ansi.green("💴 你把欠" + n.name + "的 " + debt + " 元还清了。"));
            out.add(Ansi.gray("　" + n.name + "直夸你讲信用，好感+8。"));
            return;
        }
        int want = GameService.parseInt(args[1], 0);
        if (want <= 0) {
            out.add(Ansi.yellow("借多少？borrow <编号> <金额>"));
            return;
        }
        int maxLoan = 50 + n.affection * 3 + (int) (gs.gearCharm() * 2);
        if (want > maxLoan) {
            out.add(Ansi.red("以你们的关系，最多借 " + maxLoan + " 元。"));
            return;
        }
        double rate = 0.25 + n.affection / 120.0 + gs.gearCharm() * 0.002;
        rate = Math.min(0.9, rate * (1 + gs.socialBonus()));
        out.add(Ansi.cyan("💴 你支支吾吾地向" + n.name + "开口借钱……"));
        if (gs.rnd().nextDouble() < rate) {
            s.character.money += want;
            s.npcDebt.put(n.id, s.npcDebt.getOrDefault(n.id, 0) + want);
            n.lastInteractDay = s.day();
            out.add(Ansi.gold("　" + n.name + "二话不说借给你 " + want + " 元！"));
            out.add(Ansi.gray("　记得还：borrow " + n.id + " repay。欠账不还会伤感情的。"));
        } else {
            gainAffection(gs, n, -3);
            out.add(Ansi.red("　" + n.name + "面露难色：『我最近手头也紧……』"));
            out.add(Ansi.gray("　好感-3。还是先去打工攒钱吧。"));
        }
    }

    /** 向 NPC 请教/学点东西：智力成长，关系越近效果越好 */
    public static void learn(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        GameState s = gs.state();
        int gain = 3 + (int) (n.affection / 20.0);
        gain = (int) (gain * (1 + gs.personalityLearnBonus()));
        gainAffection(gs, n, 4);
        gs.changeMood(1);
        gs.advanceTime(60);
        n.lastInteractDay = s.day();
        String topic = switch (gs.rnd().nextInt(5)) {
            case 0 -> n.name + "教了你几手" + n.profession + "的门道";
            case 1 -> "你们一起研究起手机里的小知识";
            case 2 -> n.name + "讲了讲他/她老家的风土人情";
            case 3 -> "你们聊了聊城里找工作的经验";
            default -> n.name + "给你讲了几个理财避坑小贴士";
        };
        out.add(Ansi.cyan("📖 你和" + n.name + "聊了一小时，长了见识。"));
        out.add(Ansi.gray("　" + topic + "。"));
        int iq = 0;
        if (s.learnCount % 3 == 2 && s.character.intel < 90) {
            s.character.intel++;
            iq = 1;
        }
        s.learnCount++;
        out.add(Ansi.green("　智力经验 +" + gain + "（每 3 次请教智力 +1）" + (iq > 0 ? "，智力 +1（" + (s.character.intel - 1) + " → " + s.character.intel + "）" : "") + "，好感+4"));
    }

    /** 与 NPC 聊些交心的：随机小事件，增强真实感 */
    public static void gossip(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        GameState s = gs.state();
        int gain = 4 + gs.rnd().nextInt(4) + (int) (gs.gearCharm() * 0.05);
        gain = (int) (gain * (1 + gs.socialBonus()) * (1 + gs.personalitySocialBonus()));
        gainAffection(gs, n, gain);
        gs.changeMood(2);
        gs.advanceTime(20);
        n.lastInteractDay = s.day();
        String story = switch (gs.rnd().nextInt(6)) {
            case 0 -> n.name + "悄悄告诉你：街头新开了家超好吃的早餐摊。";
            case 1 -> n.name + "跟你说起年轻时走南闯北的故事。";
            case 2 -> "你们聊起这座城市的变化，都感叹日子过得真快。";
            case 3 -> n.name + "吐槽了一下最近菜价又涨了。";
            case 4 -> n.name + "说梦见中彩票了，你们一起笑了半天。";
            default -> "你们聊起各自的老家，突然都想家了。";
        };
        out.add(Ansi.cyan("💭 你们聊了点知心话。"));
        out.add(Ansi.gray("　" + story));
        out.add(Ansi.green("　好感 +" + gain + "（当前 " + n.affection + "/100），心情+2"));
    }

    // ============ 内部工具 ============

    public static NPC resolve(GameService gs, String[] args, List<String> out) {
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：<编号>，先 social 看看附近的人。"));
            return null;
        }
        int idx = GameService.parseInt(args[0], -1);
        List<NPC> all = gs.state().npcs;
        List<NPC> list = all.stream().filter(n -> !n.isFixed).toList();
        if (idx >= 1 && idx <= list.size()) return list.get(idx - 1);
        NPC byId = all.stream().filter(n -> n.id.equals(args[0])).findFirst().orElse(null);
        if (byId == null) {
            out.add(Ansi.red("没有这个人，输入 social 查看。"));
        }
        return byId;
    }

    public static void gainAffection(GameService gs, NPC n, int gain) {
        n.affection = Math.min(100, n.affection + gain);
        String old = n.relation;
        String neu = old;
        if (n.affection >= 85) neu = "FIANCEE";
        else if (n.affection >= 60) neu = "CRUSH";
        else if (n.affection >= 30) neu = "FRIEND";
        if (!neu.equals(old) && !"SPOUSE".equals(old)) {
            n.relation = neu;
            gs.pushEvent(Ansi.pink("💕 你和" + n.name + "的关系升级为「" + gs.relationName(neu) + "」！"));
        }
    }
}
