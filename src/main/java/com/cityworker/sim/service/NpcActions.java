package com.cityworker.sim.service;

import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/**
 * 固定 NPC 互动：工头老周 / 房东王阿姨 / 老板娘翠花 / 中介刘哥 / 流浪猫大黄
 * 命令：npc [talk|oddjob|bargain|refer|feed]
 */
public final class NpcActions {

    private NpcActions() {}

    public static NPC find(GameService gs, String nameOrRole) {
        if (nameOrRole == null) return null;
        String key = nameOrRole.trim();
        return gs.state().npcs.stream()
                .filter(n -> n.isFixed && (n.name.equals(key) || n.role.equals(key)))
                .findFirst().orElse(null);
    }

    public static void npc(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (args.length >= 1 && "talk".equalsIgnoreCase(args[0])) { talk(gs, out, args); return; }
        if (args.length >= 1 && "oddjob".equalsIgnoreCase(args[0])) { oddJob(gs, out, args); return; }
        if (args.length >= 1 && "bargain".equalsIgnoreCase(args[0])) { bargain(gs, out, args); return; }
        if (args.length >= 1 && "refer".equalsIgnoreCase(args[0])) { refer(gs, out, args); return; }
        if (args.length >= 1 && "feed".equalsIgnoreCase(args[0])) { feed(gs, out, args); return; }
        list(gs, out);
    }

    /** 城里的熟人 */
    public static void list(GameService gs, List<String> out) {
        GameState s = gs.state();
        out.add(Ansi.banner("城里认识的人", "CITY NPCs"));
        out.add(Ansi.gray("　这座城里除了匆匆的路人，还有几位老熟人。多走动走动，会有意想不到的收获。"));
        out.add("");
        for (NPC n : s.npcs) {
            if (!n.isFixed) continue;
            String role = switch (n.role) {
                case "foreman" -> "👷 工头·";
                case "landlady" -> "🏠 房东·";
                case "madam" -> "🍜 老板娘·";
                case "agent" -> "💼 中介·";
                case "cat" -> "🐱 流浪猫·";
                default -> "👤 ";
            };
            String aff = n.role.equals("cat") ? "亲密度 " + n.affection + "/100" : "好感 " + n.affection + "/100";
            out.add(Ansi.cyan("  " + role) + Ansi.bold(n.name)
                    + Ansi.gray("　" + n.profession + " · " + n.personality + " · " + aff));
        }
        out.add("");
        out.add(Ansi.yellow("　互动：npc talk <名字> 聊天（免费）"));
        out.add(Ansi.yellow("　专属：npc oddjob 老周接零工｜npc bargain 王阿姨讲价房租｜npc refer 刘哥找工作门路｜npc feed 大黄喂猫"));
    }

    /** 聊天：+心情 +好感 */
    public static void talk(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        GameState s = gs.state();
        int mood = 3 + gs.rnd().nextInt(4);
        int aff = 2 + gs.rnd().nextInt(3);
        gs.changeMood(mood);
        n.affection = Math.min(100, n.affection + aff);
        String line = switch (n.role) {
            case "foreman" -> pick(gs, new String[]{
                    "「小老弟，干活踏实点，哥罩着你。」老周拍拍你的肩膀。",
                    "「今天工地缺人，你要是闲着，随时来找我。」老周递了根烟。",
                    "「听说东边那个楼盘要赶工期，招人，日结。」老周压低声音说。"});
            case "landlady" -> pick(gs, new String[]{
                    "「小X啊，城里日子不好过吧？房租的事好商量。」王阿姨给你塞了俩橘子。",
                    "「这楼里住了仨大学生，都跟你差不多年纪。」王阿姨絮叨着家常。",
                    "「要是手头紧，阿姨这儿能宽限两天。」王阿姨慈眉善目地说。"});
            case "madam" -> pick(gs, new String[]{
                    "「小伙子，看你饿的，这碗面送你了！」翠花把面推到你面前。",
                    "「今天进的菜新鲜，我给你多搁俩蛋。」翠花麻利地忙活着。",
                    "「夜里降温，别睡街上了，姐这儿有件旧棉袄。」翠花叹口气。"});
            case "agent" -> pick(gs, new String[]{
                    "「兄弟，信息就是金钱。这城里哪家厂子招人，没有我刘哥不知道的。」",
                    "「想换好工作？先交点学费，哥给你指条明路。」刘哥嘿嘿一笑。",
                    "「最近科技园那家厂工资涨了，一般人我不告诉他。」刘哥压低声音。"});
            case "cat" -> pick(gs, new String[]{
                    "大黄「喵呜~」一声，用脑袋蹭了蹭你的裤腿。",
                    "大黄叼来一片落叶放在你脚边，像在给你送礼物。",
                    "大黄躺在纸箱里翻出肚皮，朝你打了个滚。"});
            default -> n.name + "朝你点了点头。";
        };
        out.add(Ansi.gray("　" + line));
        out.add(Ansi.cyan("　心情 +" + mood + "，" + (n.role.equals("cat") ? "亲密度" : "好感") + " +" + aff));
    }

    /** 老周专属：零工 */
    public static void oddJob(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!"foreman".equals(n.role)) { out.add(Ansi.yellow(n.name + "没有零工给你。找工头老周（npc oddjob 老周）。")); return; }
        GameState s = gs.state();
        if (!"street".equals(s.locationId) && !"workplace".equals(s.locationId)) {
            out.add(Ansi.yellow("老周在街口蹲活儿，去大街找他（move 大街）。"));
            return;
        }
        if (s.character.stamina < 20) {
            out.add(Ansi.red("你累得胳膊都抬不起来，老周摇摇头：「先回去歇歇吧。」"));
            return;
        }
        int earn = 40 + gs.rnd().nextInt(50) + (int) (gs.personalityWorkBonus() * 8);
        s.character.money += earn;
        gs.changeStamina(-15);
        gs.changeMood(2);
        n.affection = Math.min(100, n.affection + 3);
        gs.advanceTime(60);
        out.add(Ansi.cyan("　你在老周的工地上打了一小时零工：搬砖、拌水泥、扛麻袋。"));
        out.add(Ansi.green("　结到 " + earn + " 元日结现金，体力 -15，老周好感 +3。"));
        gs.pushEvent(Ansi.yellow("👷 老周的零工：+ " + earn + " 元"));
    }

    /** 王阿姨专属：房租讲价 */
    public static void bargain(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!"landlady".equals(n.role)) { out.add(Ansi.yellow(n.name + "不租房给你。找房东王阿姨（npc bargain 王阿姨）。")); return; }
        GameState s = gs.state();
        if (!s.ownedEstates.isEmpty() && "home".equals(s.housingId)) {
            out.add(Ansi.yellow("你都住自己房子里了，还跟王阿姨讲什么价。"));
            return;
        }
        int chance = 35 + n.affection / 5 + (int) (gs.gearCharm() * 0.8);
        if (gs.rnd().nextInt(100) < chance) {
            int back = 10 + gs.rnd().nextInt(15);
            s.character.money += back;
            gs.changeMood(6);
            n.affection = Math.min(100, n.affection + 4);
            out.add(Ansi.green("　王阿姨叹口气：「行了行了，下个月房租给你免" + back + "块，省着点花。」"));
            out.add(Ansi.green("　房租减免 " + back + " 元，心情 +6，王阿姨好感 +4。"));
        } else {
            gs.changeMood(-2);
            out.add(Ansi.yellow("　王阿姨摆摆手：「小X，阿姨也是小本生意，这价真少不了。」"));
            out.add(Ansi.gray("　讲价失败（好感度越高、穿得越体面越容易成功）。"));
        }
    }

    /** 刘哥专属：职业介绍（获得入职加薪 buff + 一条股市内幕） */
    public static void refer(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!"agent".equals(n.role)) { out.add(Ansi.yellow(n.name + "不做中介。找中介刘哥（npc refer 刘哥）。")); return; }
        GameState s = gs.state();
        if (s.referBonus > 0) {
            out.add(Ansi.yellow("　刘哥拍拍胸脯：「你那事儿我记着呢，放心！」"));
            return;
        }
        if (s.character.money < 50) {
            out.add(Ansi.red("　刘哥伸出手：「介绍费 50 块，兄弟你手头……」你尴尬地摸了摸口袋。"));
            return;
        }
        s.character.money -= 50;
        s.referBonus = 0.15;
        gs.changeMood(3);
        n.affection = Math.min(100, n.affection + 3);
        out.add(Ansi.green("　刘哥收了 50 块介绍费，压低声音："));
        out.add(Ansi.gray("　「科技园那边正缺人，我认识人事主管。你去入职，工资哥给你多谈 15%。」"));
        out.add(Ansi.yellow("　✔ 获得入职加薪 buff：下次入职薪资 +15%"));
        // 顺带一条股市内幕（随机）
        GameState.StockQuote q = s.market.get(gs.rnd().nextInt(s.market.size()));
        boolean good = gs.rnd().nextBoolean();
        out.add(Ansi.gray("　「再送你个消息：「" + q.name + "」" + (good ? "据说有大客户下单，可以看看。" : "最近有人大量出货，悠着点。") + "」"));
        gs.pushEvent(Ansi.cyan("💼 刘哥的介绍：入职加薪 buff 已就绪"));
    }

    /** 大黄专属：喂猫 */
    public static void feed(GameService gs, List<String> out, String[] args) {
        NPC n = resolve(gs, args, out);
        if (n == null) return;
        if (!"cat".equals(n.role)) { out.add(Ansi.yellow(n.name + "不吃猫粮。喂大黄的话：npc feed 大黄。")); return; }
        GameState s = gs.state();
        if (s.character.money < 8) {
            out.add(Ansi.red("　你翻了翻口袋，连 8 块钱的猫粮都买不起。大黄「喵~」了一声，似懂非懂。"));
            return;
        }
        if (s.lastFeedDay == s.day()) {
            out.add(Ansi.gray("　大黄已经吃饱了，正懒洋洋地晒太阳。明天再来吧。"));
            return;
        }
        s.character.money -= 8;
        gs.changeMood(8);
        n.affection = Math.min(100, n.affection + 5);
        if (s.lastFeedDay == s.day() - 1) {
            s.fedCatDays++;
        } else {
            s.fedCatDays = 1;
        }
        s.lastFeedDay = s.day();
        out.add(Ansi.green("　你花 8 元买了袋猫粮，大黄埋头吃得呼噜呼噜响。"));
        out.add(Ansi.green("　心情 +8，大黄亲密度 +5（连续投喂 " + s.fedCatDays + " 天）。"));
        gs.checkAchievements(out);
    }

    private static NPC resolve(GameService gs, String[] args, List<String> out) {
        if (args.length < 2) {
            out.add(Ansi.yellow("用法：npc talk <名字>，如 npc talk 老周（npc 查看所有熟人）"));
            return null;
        }
        NPC n = find(gs, args[1]);
        if (n == null) {
            out.add(Ansi.red("没有这个熟人。输入 npc 看看城里都有谁。"));
            return null;
        }
        return n;
    }

    private static String pick(GameService gs, String[] arr) {
        return arr[gs.rnd().nextInt(arr.length)];
    }
}
