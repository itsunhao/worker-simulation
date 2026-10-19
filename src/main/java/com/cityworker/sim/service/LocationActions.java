package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.List;

/**
 * v2.0 都市生活充实包 · 地点深度交互
 * 让每个地点都更有生活气息：闲聊、练摊、听讲座、观察行情……
 * 全部玩法同时支持终端指令与图形界面按钮（pop:'action'）。
 */
public final class LocationActions {

    private LocationActions() {}

    /** 便利店/小卖部（大街）：买瓶水、听店主唠嗑，随机小彩蛋 */
    public static void conv(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"street".equals(s.locationId)) { out.add(Ansi.red("大街上的小卖部才能唠嗑（move 大街）。")); return; }
        int cost = 3;
        if (s.character.money < cost) { out.add(Ansi.red("连瓶水都买不起，先捡点废品吧。")); return; }
        s.character.money -= cost;
        gs.changeHunger(5);
        gs.advanceTime(10);
        double r = gs.rnd().nextDouble();
        if (r < 0.08) {
            int lucky = 20 + gs.rnd().nextInt(30);
            s.character.money += lucky;
            out.add(Ansi.gold("🏪 店主说你看着面善，多找了 " + lucky + " 块钱！运气不错！"));
        } else if (r < 0.25) {
            gs.changeMood(2);
            out.add(Ansi.cyan("🏪 店主是个话痨，跟你唠了半小时家常，心情+2。"));
        } else {
            out.add(Ansi.gray("🏪 你在小卖部买了瓶水（3元），听店主感慨了一通房租又涨了。"));
        }
    }

    /** 人才市场：看张贴的招工传单，随机发现小情报/隐藏岗位 */
    public static void bulletin(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"jobmarket".equals(s.locationId)) { out.add(Ansi.red("人才市场的公告栏才能看到（move 人才市场）。")); return; }
        gs.advanceTime(10);
        double r = gs.rnd().nextDouble();
        if (r < 0.15) {
            int tip = 30 + gs.rnd().nextInt(60);
            s.character.money += tip;
            out.add(Ansi.gold("📌 公告栏角落贴着一张「急招临时搬运，当天结账」的纸条！你接了活，赚了 " + tip + " 元！"));
            gs.changeStamina(-6);
            gs.changeHunger(-3);
        } else if (r < 0.4) {
            gs.changeMood(1);
            out.add(Ansi.cyan("📌 你仔细读了读公告栏，摸清了几家公司的招工行情，找工作心里更有底了。"));
        } else {
            out.add(Ansi.gray("📌 公告栏上贴满了招工启事，大多是些体力活，你没看出什么特别的。"));
        }
    }

    /** 商场：试衣间里试衣服，偶尔捡到顾客遗忘的优惠券 */
    public static void tryon(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"mall".equals(s.locationId)) { out.add(Ansi.red("商场才有试衣间（move 商场）。")); return; }
        gs.advanceTime(20);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.12) {
            int coupon = 10 + gs.rnd().nextInt(40);
            out.add(Ansi.gold("👕 你在试衣间里捡到一张别人落下的 " + coupon + " 元优惠券！白赚的！"));
            s.character.money += coupon;
        } else if (r < 0.4) {
            out.add(Ansi.cyan("👕 你试了几件新款，虽然买不起，但发现自己的气质确实该提升了。"));
        } else {
            out.add(Ansi.gray("👕 你在商场逛了逛，饱了饱眼福，心情不错。"));
        }
    }

    /** 美食街：街头试吃巡游，免费小确幸 */
    public static void taste(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"foodstreet".equals(s.locationId)) { out.add(Ansi.red("美食街的试吃摊才热闹（move 美食街）。")); return; }
        gs.advanceTime(15);
        gs.changeHunger(10);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            out.add(Ansi.gold("🍢 你试吃了十来个摊位，居然碰上个搞活动的大叔送了你一整份烤串！心情大好！"));
            gs.changeMood(3);
            gs.changeHunger(15);
        } else if (r < 0.35) {
            out.add(Ansi.cyan("🍢 试吃巡游走起！一圈下来混了个半饱，心情+2。"));
        } else {
            out.add(Ansi.gray("🍢 你挨个摊子试吃，被老板娘嫌弃地看了一眼，但吃饱了。"));
        }
    }

    /** 花店：帮老板娘整理花材，学点插花小技巧（低成本魅力成长） */
    public static void flowerWork(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"flower".equals(s.locationId)) { out.add(Ansi.red("花店老板娘才会让你帮忙（move 花店）。")); return; }
        gs.advanceTime(30);
        gs.changeStamina(-2);
        gs.changeHunger(-2);
        double r = gs.rnd().nextDouble();
        if (r < 0.15) {
            out.add(Ansi.gold("🌷 老板娘看你手脚麻利，送你一枝玫瑰！心情+3。"));
            gs.changeMood(3);
            gs.changeMood(1);
        } else {
            out.add(Ansi.cyan("🌷 你帮花店理了理花材，沾了一手花香，心情不错。"));
            gs.changeMood(1);
        }
    }

    /** 酒吧：听驻唱歌手唱两首，心事都被唱出来了 */
    public static void music(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"bar".equals(s.locationId)) { out.add(Ansi.red("酒吧的驻唱才开嗓（move 酒吧）。")); return; }
        gs.advanceTime(30);
        gs.changeMood(3);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            out.add(Ansi.gold("🎵 歌手唱到动情处，全场安静。你忽然觉得，这座城市也没那么冷。"));
            gs.changeMood(4);
        } else if (r < 0.3) {
            out.add(Ansi.cyan("🎵 你跟着调子哼了两句，旁边大叔朝你举了举杯。"));
        } else {
            out.add(Ansi.gray("🎵 你坐在角落听了半小时歌，把心事都泡进了酒杯里。"));
        }
    }

    /** 台球厅：自己练练手感，小概率找回状态 */
    public static void snooker(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"billiards".equals(s.locationId)) { out.add(Ansi.red("台球厅的球台随便练（move 台球厅）。")); return; }
        gs.advanceTime(30);
        gs.changeStamina(-3);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            out.add(Ansi.gold("🎱 今天手感爆棚，连进三杆好球，旁边的人直呼内行！心情+3。"));
            gs.changeMood(3);
        } else {
            out.add(Ansi.gray("🎱 你一个人练了会儿球，技术说不上涨，但消磨了时间。"));
        }
    }

    /** 会所：和前台姑娘聊聊，涨点体面见识 */
    public static void lounge(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"club".equals(s.locationId)) { out.add(Ansi.red("会所大堂才有得聊（move 会所）。")); return; }
        gs.advanceTime(20);
        gs.changeMood(1);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            gs.changePrestige(2);
            out.add(Ansi.gold("🥂 你和会所经理聊了几句，他记住了你这个懂事的年轻人。声望+2。"));
        } else {
            out.add(Ansi.gray("🥂 你在会所大堂沙发坐了一会儿，观察着来往的体面人，暗暗立志。"));
        }
    }

    /** 彩票店：研究走势图，为下一次中奖做功课（小幅提升下次中奖率） */
    public static void studyLotto(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"lottery".equals(s.locationId)) { out.add(Ansi.red("彩票店的走势图才有得研究（move 彩票店）。")); return; }
        gs.advanceTime(20);
        gs.changeStamina(-1);
        double r = gs.rnd().nextDouble();
        if (r < 0.12) {
            out.add(Ansi.gold("🎰 你从走势图里悟出点门道，随手记了几个号码——感觉这期有戏！"));
            s.studyLottoStreak++;
        } else {
            s.studyLottoStreak = Math.max(0, s.studyLottoStreak - 1);
            out.add(Ansi.gray("🎰 走势图看得你眼花缭乱，研究了个寂寞。"));
        }
    }

    /** 菜市场：帮摊主整理菜摊，学学怎么挑菜（生活技能彩蛋） */
    public static void marketWork(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"market".equals(s.locationId)) { out.add(Ansi.red("菜市场的摊主才会让你搭把手（move 菜市场）。")); return; }
        gs.advanceTime(30);
        gs.changeStamina(-3);
        gs.changeHunger(-2);
        double r = gs.rnd().nextDouble();
        if (r < 0.15) {
            int veg = 3 + gs.rnd().nextInt(8);
            s.character.money += veg;
            out.add(Ansi.gold("🥬 摊主看你勤快，送了你一把新鲜青菜（省了 " + veg + " 元）。"));
            gs.changeHunger(5);
        } else {
            out.add(Ansi.cyan("🥬 你帮菜摊理了理菜，学会了怎么看菜新不新鲜，挺实用的。"));
        }
    }

    /** 银行：排队等号，听大堂经理聊几句理财（小额声望+偶发灵感） */
    public static void lobby(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"bank".equals(s.locationId)) { out.add(Ansi.red("银行大堂才有理财经理（move 银行）。")); return; }
        gs.advanceTime(20);
        double r = gs.rnd().nextDouble();
        if (r < 0.12) {
            gs.changePrestige(1);
            out.add(Ansi.gold("🏦 大堂经理看你面生，免费给你讲了一课理财常识。声望+1。"));
        } else {
            out.add(Ansi.gray("🏦 你在银行大厅等了会儿号，顺便看了看墙上的理财产品海报。"));
        }
    }

    /** 4S店：试坐豪车，感受一下有钱人的世界 */
    public static void testDrive(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"carshop".equals(s.locationId)) { out.add(Ansi.red("4S店展厅里有豪车可以试坐（move 4S店）。")); return; }
        gs.advanceTime(20);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            out.add(Ansi.gold("🚗 销售看你顺眼，让你试驾了一圈！一脚油门下去，心都飞了！心情+4。"));
            gs.changeMood(2);
        } else {
            out.add(Ansi.gray("🚗 你坐进驾驶室感受了一下真皮座椅，暗暗发誓要买一辆。"));
        }
    }

    /** 房产中介：看样板间，憧憬未来（心情+小概率捡到优惠信息） */
    public static void viewHome(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"estate".equals(s.locationId)) { out.add(Ansi.red("房产中介的样板间随便看（move 房产中介）。")); return; }
        gs.advanceTime(25);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            gs.changePrestige(1);
            out.add(Ansi.gold("🏠 中介带你看了一套特价房，你认真记下了行情。声望+1。"));
        } else {
            out.add(Ansi.gray("🏠 你在样板间里畅想了一下「以后我家也要这样」，心情不错。"));
        }
    }

    /** 公园：晨练/遛弯（与跑步不同的轻松向） */
    public static void stroll(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"park".equals(s.locationId)) { out.add(Ansi.red("公园里散散步才惬意（move 城市公园）。")); return; }
        gs.advanceTime(30);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.08) {
            int coin = 5 + gs.rnd().nextInt(20);
            s.character.money += coin;
            out.add(Ansi.gold("🌳 你在长椅下捡到 " + coin + " 块钱！好运+心情+3。"));
            gs.changeMood(1);
        } else {
            out.add(Ansi.cyan("🌳 你在公园里散了散步，看看遛弯的大爷大妈，心情+2。"));
        }
    }

    /** 夜市：逛吃逛吃（与 eat 有别的氛围向） */
    public static void nightWalk(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"nightmarket".equals(s.locationId)) { out.add(Ansi.red("夜市的热闹得晚上去（move 夜市）。")); return; }
        gs.advanceTime(20);
        gs.changeHunger(5);
        gs.changeMood(2);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            out.add(Ansi.gold("🏮 你逛到一家新开的小摊，老板热情地请你试吃！心情+3，饱腹+8。"));
            gs.changeHunger(3);
            gs.changeMood(1);
        } else {
            out.add(Ansi.gray("🏮 你在夜市里慢慢晃悠，闻着各种香味，人间烟火气最抚凡人心。"));
        }
    }

    /** 鬼市：听老人讲古，涨见识（偶发好运） */
    public static void ghostTalk(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"ghostmarket".equals(s.locationId)) { out.add(Ansi.red("鬼市的老摊主才有故事（move 鬼市）。")); return; }
        gs.advanceTime(20);
        double r = gs.rnd().nextDouble();
        if (r < 0.1) {
            gs.changeMood(2);
            out.add(Ansi.gold("🕯️ 摆摊老人给你讲了个关于好运的古话，你听完心里亮堂了。心情+2。"));
        } else {
            out.add(Ansi.gray("🕯️ 你在鬼市听摊主们讲了些老故事，半信半疑，但挺有意思。"));
        }
    }
}
