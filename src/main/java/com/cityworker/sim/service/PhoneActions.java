package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.NPC;
import com.cityworker.sim.util.Ansi;
import com.cityworker.sim.model.GameState;
import java.util.*;

/** 手机图形界面：聊天 / 短视频 / 点外卖 */
public class PhoneActions {

    public static boolean hasPhone(GameState s) {
        return s.inventory.contains("phone") || s.inventory.contains("phone_smart");
    }

    /** 返回结构化数据给前端；同时把终端文案写入 out */
    public static Map<String, Object> modal(GameService gs, List<String> out, String action, String foodId, String npcId) {
        GameState s = gs.state();
        Map<String, Object> resp = new LinkedHashMap<>();
        if (!hasPhone(s)) {
            out.add(Ansi.yellow("你还没有手机。去商场（move 商场）买一部手机，就能用手机了。"));
            resp.put("ok", false);
            return resp;
        }
        resp.put("ok", true);
        switch (action == null ? "chat" : action) {
            case "video" -> video(gs, out, resp);
            case "takeout" -> takeout(gs, out, resp);
            case "order" -> order(gs, out, resp, foodId);
            case "contacts" -> contacts(gs, out, resp);
            case "chatnpc" -> chatNpc(gs, out, resp, npcId);
            default -> chat(gs, out, resp);
        }
        return resp;
    }

    /** 通讯录：全部认识的 NPC */
    private static void contacts(GameService gs, List<String> out, Map<String, Object> resp) {
        GameState s = gs.state();
        List<Map<String, Object>> list = new ArrayList<>();
        for (NPC n : s.npcs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", n.id);
            m.put("name", n.name);
            m.put("gender", n.gender);
            m.put("profession", n.profession);
            m.put("relation", n.relation);
            m.put("relationCn", gs.relationName(n.relation));
            m.put("affection", n.affection);
            m.put("avatar", n.name != null && !n.name.isEmpty() ? n.name.substring(0, 1) : "?");
            list.add(m);
        }
        resp.put("contacts", list);
        out.add(Ansi.cyan("📱 通讯录里有 " + list.size() + " 位联系人。"));
    }

    /** 和指定联系人聊天：好感度 +2（恋人/配偶 +3） */
    private static void chatNpc(GameService gs, List<String> out, Map<String, Object> resp, String npcId) {
        GameState s = gs.state();
        if (npcId == null) {
            resp.put("ok", false);
            resp.put("msg", "请选择一位联系人");
            return;
        }
        NPC npc = null;
        for (NPC n : s.npcs) if (npcId.equals(n.id)) { npc = n; break; }
        if (npc == null) {
            resp.put("ok", false);
            resp.put("msg", "通讯录里找不到这位联系人");
            return;
        }
        gs.advanceTime(6);
        boolean intimate = "LOVER".equals(npc.relation) || "SPOUSE".equals(npc.relation)
                || "FIANCEE".equals(npc.relation) || "CRUSH".equals(npc.relation);
        int gain = intimate ? 3 : 2;
        int before = npc.affection;
        npc.affection = Math.min(100, npc.affection + gain);
        npc.lastInteractDay = s.day();
        String[] pool;
        if ("SPOUSE".equals(npc.relation) || "FIANCEE".equals(npc.relation)) {
            pool = new String[]{
                "今天下班回来吃饭吗？我买了你爱吃的菜。",
                "下周咱们把家里再添点东西吧，都听你的。",
                "天冷了，记得多穿点，感冒了我会心疼。",
                "周末要不要一起出去走走？城西新开了个公园。"
            };
        } else if (intimate) {
            pool = new String[]{
                "刚看到一件特别适合你的衣服，下次见面带给你。",
                "晚上有空吗？想约你吃饭。",
                "你最近是不是瘦了？别太累啊。",
                "想你了，忙完记得回我消息。"
            };
        } else if ("FRIEND".equals(npc.relation)) {
            pool = new String[]{
                "听说了没？夜市新摆了个套圈的摊，改天去试试？",
                "你上次说的那家面馆我去了，确实不错！",
                "最近工地上忙吗？别光顾着挣钱，注意身体。",
                "公园有人下棋，咱们组个队去赢他们两把？"
            };
        } else {
            pool = new String[]{
                "你好呀，最近过得怎么样？",
                "在这座城市打拼都不容易，加油！",
                "有空常来我们这儿坐坐。",
                "看你这人挺实在的，交个朋友吧。"
            };
        }
        List<Map<String, Object>> msgs = new ArrayList<>();
        Map<String, Object> msg = new LinkedHashMap<>();
        msg.put("from", npc.name);
        msg.put("avatar", npc.name != null && !npc.name.isEmpty() ? npc.name.substring(0, 1) : "?");
        msg.put("gender", npc.gender);
        msg.put("text", pool[gs.rnd().nextInt(pool.length)]);
        msgs.add(msg);
        Map<String, Object> mine = new LinkedHashMap<>();
        mine.put("from", "我");
        mine.put("mine", true);
        mine.put("text", "哈哈，好啊，回头聊！😄");
        msgs.add(mine);
        resp.put("ok", true);
        resp.put("npcId", npc.id);
        resp.put("npcName", npc.name);
        resp.put("msgs", msgs);
        resp.put("affection", npc.affection);
        resp.put("gain", npc.affection - before);
        resp.put("relation", npc.relation);
        resp.put("relationCn", gs.relationName(npc.relation));
        out.add(Ansi.cyan("📱 你和「" + npc.name + "」聊了一会儿，好感度 +" + gain + "（" + npc.affection + "/100）。"));
    }

    private static void chat(GameService gs, List<String> out, Map<String, Object> resp) {
        GameState s = gs.state();
        gs.advanceTime(8);
        gs.changeMood(2);
        List<Map<String, Object>> msgs = new ArrayList<>();
        String[] pool = {
            "老周：明天工地加半天班，去不去？多半天算 120。",
            "翠花：新进了一批红心火龙果，晚上给你留两个！",
            "房东：房租下个月一号前记得交啊，微信转我就行。",
            "老李：公园那盘棋没下完呢，改天接着来，赌 20 的。",
            "二丫：看你朋友圈发加班，别太拼，身体要紧。",
            "张叔：台球厅晚上有局，来不来？输了请我喝水。",
            "妈妈：天冷了记得加衣服，钱不够跟家里说。",
            "胖姐：夜市新上的烤冷面，趁热吃才香，来姐这坐坐！"
        };
        int n = 2 + gs.rnd().nextInt(2);
        Collections.shuffle(Arrays.asList(pool), gs.rnd());
        for (int i = 0; i < n && i < pool.length; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("from", pool[i].split("：")[0]);
            m.put("avatar", "👤");
            m.put("text", pool[i].split("：", 2)[1]);
            msgs.add(m);
        }
        Map<String, Object> mine = new LinkedHashMap<>();
        mine.put("from", "我");
        mine.put("avatar", "male".equals(gs.state().character.gender) ? "👦" : "👧");
        mine.put("text", "……收到！回头聊 😄");
        mine.put("mine", true);
        msgs.add(mine);
        resp.put("msgs", msgs);
        out.add(Ansi.cyan("📱 你打开微信，回了几条消息，心情 +2。"));
    }

    private static void video(GameService gs, List<String> out, Map<String, Object> resp) {
        GameState s = gs.state();
        gs.advanceTime(15);
        int mood = 3 + gs.rnd().nextInt(5);
        gs.changeMood(mood);
        String[][] pool = {
            {"打工人干饭日常", "工地盒饭也能吃出米其林仪式感，看饿了。", "#干饭 #打工人"},
            {"三分钟学会翻墙进屋", "不是！是翻墙装空调！师傅这波操作 666。", "#技术活 #高空作业"},
            {"夜市套圈大神", "老板当场黑脸：这小伙子是来进货的吧？", "#套圈 #夜市"},
            {"流浪猫救助站的一天", "大黄的兄弟找到了新家，看哭了。", "#猫 #暖心"},
            {"彩票站奇遇", "大爷中了 500 万还不忘请街坊吃糖。", "#暴富 #锦鲤"},
            {"房产中介的嘴", "这房子我看了都心动，就是钱包不争气。", "#买房 #打工人"},
            {"21点赌神速成", "学会这个，公园牌桌上横着走！", "#黑杰克 #棋牌"},
            {"菜市场砍价技巧", "阿姨：15 块！我：10 块！阿姨：成交！", "#生活 #菜市场"}
        };
        List<Map<String, Object>> vids = new ArrayList<>();
        int n = 3;
        Collections.shuffle(Arrays.asList(pool), gs.rnd());
        for (int i = 0; i < n; i++) {
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("title", pool[i][0]);
            v.put("desc", pool[i][1]);
            v.put("tag", pool[i][2]);
            v.put("plays", 1000 + gs.rnd().nextInt(90000));
            vids.add(v);
        }
        resp.put("videos", vids);
        resp.put("moodGain", mood);
        out.add(Ansi.cyan("📱 你刷了 15 分钟短视频，停不下来，心情 +" + mood + "。"));
    }

    private static void takeout(GameService gs, List<String> out, Map<String, Object> resp) {
        GameState s = gs.state();
        List<Map<String, Object>> items = new ArrayList<>();
        Set<String> picks = new LinkedHashSet<>(Arrays.asList("foodstreet", "braised", "malatang", "dumpling", "hotpot", "nightmarket", "any"));
        for (GameConfig.FoodDef f : gs.cfg().foods) {
            if (picks.contains(f.place)) {
                Map<String, Object> it = new LinkedHashMap<>();
                it.put("id", f.id);
                it.put("name", f.name);
                it.put("cost", f.cost + 4);   // 配送费 4 元
                it.put("desc", f.desc);
                it.put("hunger", f.hunger);
                it.put("stamina", f.stamina);
                it.put("mood", f.mood);
                it.put("emoji", "🍱");
                items.add(it);
            }
            if (items.size() >= 8) break;
        }
        resp.put("takeout", items);
        out.add(Ansi.cyan("📱 你打开外卖软件，附近有 " + items.size() + " 家店营业中。"));
    }

    private static void order(GameService gs, List<String> out, Map<String, Object> resp, String foodId) {
        GameState s = gs.state();
        GameConfig.FoodDef food = null;
        for (GameConfig.FoodDef f : gs.cfg().foods) {
            if (f.id.equals(foodId)) { food = f; break; }
        }
        if (food == null) {
            out.add(Ansi.red("没有这个外卖选项。"));
            resp.put("ok", false);
            return;
        }
        int total = food.cost + 4;
        if (s.character.money < total) {
            out.add(Ansi.red("钱不够……外卖一共 " + total + " 元（当前 " + s.character.money + " 元）。"));
            resp.put("ok", false);
            return;
        }
        s.character.money -= total;
        gs.advanceTime(30);   // 等外卖 30 分钟
        if (food.hunger > 0) gs.changeHunger(food.hunger);
        if (food.stamina > 0) gs.changeStamina(food.stamina);
        if (food.mood > 0) gs.changeMood(food.mood);
        out.add(Ansi.cyan("🛵 外卖小哥 30 分钟后送到了：「" + food.name + "」(" + total + " 元)"));
        if (food.hunger > 0) out.add(Ansi.green("　饱腹 +" + food.hunger));
        if (food.stamina > 0) out.add(Ansi.green("　体力 +" + food.stamina));
        resp.put("ordered", food.name);
        resp.put("cost", total);
    }
}
