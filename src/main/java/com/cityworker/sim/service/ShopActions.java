package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.util.Ansi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 消费与资产：商场购物 / 房产 / 车辆 / 银行存款 */
public final class ShopActions {

    private ShopActions() {}

    public static void shop(GameService gs, List<String> out) {
        GameState s = gs.state();
        if (!"mall".equals(s.locationId)) {
            out.add(Ansi.red("你不在商场。输入 move 商场 前往万象商场。"));
            return;
        }
        out.add(Ansi.banner("万象商场", "SHOPPING MALL"));
        String[] catIcon = {"clothes:👕", "pants:👖", "shoes:👞", "watch:⌚", "digital:📱", "accessory:🕶️", "pet:🐾", "health:💊", "other:📦"};
        int idx = 0;
        for (GameConfig.MallItemDef it : gs.cfg().mall) {
            idx++;
            boolean owned = s.inventory.contains(it.id);
            String icon = "📦";
            for (String kv : catIcon) {
                String[] p = kv.split(":");
                if (p[0].equals(it.category)) { icon = p[1]; break; }
            }
            String bonus = "";
            if (it.charm > 0) bonus += "魅力+" + it.charm + " ";
            if (it.prestige > 0) bonus += "声望+" + it.prestige + " ";
            if (it.mood > 0) bonus += "每天心情+" + it.mood + " ";
            if (it.socialBonus > 0) bonus += "社交效率+" + Math.round(it.socialBonus * 100) + "% ";
            out.add(Ansi.cyan(idx + ". ") + icon + " " + Ansi.bold(it.name)
                    + Ansi.gray("  " + it.cost + "元｜" + bonus.trim())
                    + (owned ? Ansi.green(" ✔已拥有") : ""));
            out.add(Ansi.darkGray("　　" + it.desc));
        }
        out.add("");
        out.add(Ansi.yellow("输入 buy <编号> 购买（穿戴上自动加属性）"));
    }

    public static void buy(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"mall".equals(s.locationId)) {
            out.add(Ansi.red("买东西要去商场（move 商场）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：buy <编号>，先 shop 看看有什么。"));
            return;
        }
        GameConfig.MallItemDef it = resolveItem(gs, args[0]);
        if (it == null) {
            out.add(Ansi.red("没有这个商品。"));
            return;
        }
        if (s.inventory.contains(it.id)) {
            out.add(Ansi.yellow("你已经拥有「" + it.name + "」了，不用重复买。"));
            return;
        }
        if (s.character.money < it.cost) {
            out.add(Ansi.red("钱不够（还差 " + (it.cost - s.character.money) + " 元）。"));
            return;
        }
        s.character.money -= it.cost;
        s.inventory.add(it.id);
        if (gs.isWearable(it.category) && !s.equipped.contains(it.id)) {
            // 同类别互斥：自动穿上新装备，换下同类旧装备
            s.equipped.removeIf(id -> {
                GameConfig.MallItemDef other = gs.cfg().mall.stream()
                        .filter(m -> m.id.equals(id)).findFirst().orElse(null);
                return other != null && other.category.equals(it.category);
            });
            s.equipped.add(it.id);
        }
        gs.advanceTime(30);
        out.add(Ansi.green("🛒 买下「" + it.name + "」（" + it.cost + "元），已穿戴/领养。"));
        if ("medicine".equals(it.id) && s.sick) {
            s.sick = false;
            s.sickName = "";
            s.sickTick = 0;
            out.add(Ansi.green("💊 你吞下药片，咳嗽慢慢止住了……病好了，又是条好汉！"));
            gs.pushEvent(Ansi.green("💊 服药后痊愈"));
        }
        StringBuilder sb = new StringBuilder();
        if (it.charm > 0) sb.append("魅力+" + it.charm + " ");
        if (it.prestige > 0) sb.append("声望+" + it.prestige + " ");
        if (it.mood > 0) sb.append("心情+" + it.mood + " ");
        if (it.socialBonus > 0) sb.append("社交效率+" + Math.round(it.socialBonus * 100) + "% ");
        if (sb.length() > 0) out.add(Ansi.cyan("　效果：" + sb.toString().trim()));
        if ("suit".equals(it.id) || "shirt".equals(it.id)) {
            out.add(Ansi.yellow("　这下能去应聘那些对着装有要求的工作了！"));
        }
        // 商场消费后与售货员互动提升好感
        if (!"medicine".equals(it.id)) {
            gs.shopNpcInteract(out, "mall", it.name);
        }
    }

    public static void assets(GameService gs, List<String> out) {
        GameState s = gs.state();
        out.add(Ansi.banner("我的资产", "ASSETS"));
        out.add(Ansi.gold("💰 现金 " + s.character.money + " 元"));
        out.add(Ansi.cyan("🏦 存款 " + s.character.deposit + " 元（日息0.05%，存越多利息越多）"));
        out.add(Ansi.magenta("⭐ 声望 " + s.character.prestige));
        out.add("");
        if (s.ownedEstates.isEmpty()) {
            out.add(Ansi.gray("🏠 房产：无（买房 buyhouse，房源见下）"));
        } else {
            out.add(Ansi.yellow("🏠 房产："));
            for (String id : s.ownedEstates) {
                GameConfig.RealEstateDef d = gs.cfg().realestate.stream().filter(r -> r.id.equals(id)).findFirst().orElse(null);
                if (d != null) {
                    out.add(Ansi.yellow("　· " + d.name + Ansi.gray("（" + d.cost + "元购入，声望+" + d.prestige
                            + (d.passiveIncome > 0 ? "，每天收租+" + d.passiveIncome + "元" : "") + "）")));
                }
            }
        }
        if (s.ownedCars.isEmpty()) {
            out.add(Ansi.gray("🚗 车辆：无（买车 buycar）"));
        } else {
            out.add(Ansi.yellow("🚗 车辆："));
            for (String id : s.ownedCars) {
                GameConfig.CarDef d = gs.cfg().cars.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null);
                if (d != null) {
                    out.add(Ansi.yellow("　· " + d.name + Ansi.gray("（" + d.cost + "元购入，声望+" + d.prestige
                            + (d.deliveryBonus > 0 ? "，配送效率+" + Math.round(d.deliveryBonus * 100) + "%" : "") + "）")));
                }
            }
        }
        if (!s.inventory.isEmpty()) {
            List<String> names = new ArrayList<>();
            for (String id : s.inventory) {
                GameConfig.MallItemDef it = gs.cfg().mall.stream().filter(m -> m.id.equals(id)).findFirst().orElse(null);
                names.add(it != null ? it.name : id);
            }
            out.add(Ansi.gray("🎒 随身物品：" + String.join("、", names)));
        }
        out.add("");
        out.add(Ansi.banner("在售房源", "REAL ESTATE"));
        for (int i = 0; i < gs.cfg().realestate.size(); i++) {
            GameConfig.RealEstateDef d = gs.cfg().realestate.get(i);
            out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(d.name) + Ansi.gray("  " + d.cost + "元｜声望+" + d.prestige
                    + (d.passiveIncome > 0 ? "｜日租+" + d.passiveIncome + "元" : "")));
        }
        out.add("");
        out.add(Ansi.banner("在售车辆", "CARS"));
        for (int i = 0; i < gs.cfg().cars.size(); i++) {
            GameConfig.CarDef d = gs.cfg().cars.get(i);
            out.add(Ansi.cyan((i + 1) + ". ") + Ansi.bold(d.name) + Ansi.gray("  " + d.cost + "元｜声望+" + d.prestige
                    + (d.deliveryBonus > 0 ? "｜配送+" + Math.round(d.deliveryBonus * 100) + "%" : "")
                    + (d.socialBonus > 0 ? "｜社交+" + Math.round(d.socialBonus * 100) + "%" : "")));
        }
        out.add("");
        out.add(Ansi.yellow("输入 buyhouse <编号> / buycar <编号> 购买"));
        out.add(Ansi.yellow("输入 bank <金额> 存钱 / withdraw <金额> 取钱"));
    }

    public static void buyHouse(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"estate".equals(s.locationId)) {
            out.add(Ansi.red("看房买房得去房产中介（move 房产中介）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：buyhouse <编号>，先 assets 看房源。"));
            return;
        }
        GameConfig.RealEstateDef d = resolveEstate(gs, args[0]);
        if (d == null) {
            out.add(Ansi.red("没有这个房源。"));
            return;
        }
        if (s.ownedEstates.contains(d.id)) {
            out.add(Ansi.yellow("你已经买下「" + d.name + "」了。"));
            return;
        }
        if (s.character.money < d.cost) {
            out.add(Ansi.red("钱不够（还差 " + (d.cost - s.character.money) + " 元）。" + (d.cost > 100000 ? "房子不是一天买得起的，慢慢来。" : "")));
            return;
        }
        s.character.money -= d.cost;
        s.ownedEstates.add(d.id);
        s.housingId = "ownhome";
        s.leaseDays = 0;
        gs.changePrestige(d.prestige);
        gs.changeMood(15);
        out.add(Ansi.gold("🏡 你买下了「" + d.name + "」！从此在城里有了自己的家。"));
        out.add(Ansi.gray("　声望 +" + d.prestige + "，心情 +15。回家睡觉恢复100%，再也不用看房东脸色。"));
    }

    public static void buyCar(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"carshop".equals(s.locationId)) {
            out.add(Ansi.red("买车得去 4S 店（move 4S店）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：buycar <编号>，先 assets 看车型。"));
            return;
        }
        GameConfig.CarDef d = resolveCar(gs, args[0]);
        if (d == null) {
            out.add(Ansi.red("没有这个车型。"));
            return;
        }
        if (s.ownedCars.contains(d.id)) {
            out.add(Ansi.yellow("你已经买了「" + d.name + "」。"));
            return;
        }
        if (s.character.money < d.cost) {
            out.add(Ansi.red("钱不够（还差 " + (d.cost - s.character.money) + " 元）。"));
            return;
        }
        s.character.money -= d.cost;
        s.ownedCars.add(d.id);
        gs.changePrestige(d.prestige);
        gs.changeMood(8);
        out.add(Ansi.gold("🚗 你提了「" + d.name + "」！钥匙在手，天下我有。"));
        out.add(Ansi.gray("　声望 +" + d.prestige + "，心情 +8"
                + (d.deliveryBonus > 0 ? "。跑外卖/快递时配送效率 +" + Math.round(d.deliveryBonus * 100) + "%" : "")
                + (d.socialBonus > 0 ? "。社交效率 +" + Math.round(d.socialBonus * 100) + "%" : "") + "。"));
    }

    public static void bank(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"bank".equals(s.locationId)) {
            out.add(Ansi.red("存钱得去银行（move 银行）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：bank <金额> 把现金存进银行吃利息（日息0.05%）。"));
            return;
        }
        int amt = GameService.parseInt(args[0], 0);
        if (amt <= 0) {
            out.add(Ansi.red("金额无效。"));
            return;
        }
        if (s.character.money < amt) {
            out.add(Ansi.red("现金不够（当前 " + s.character.money + " 元）。"));
            return;
        }
        s.character.money -= amt;
        s.character.deposit += amt;
        gs.advanceTime(10);
        out.add(Ansi.cyan("🏦 存入 " + amt + " 元，存款余额 " + s.character.deposit + " 元。"));
        out.add(Ansi.gray("　每天清晨自动结算利息，日息0.05%。"));
    }

    public static void withdraw(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"bank".equals(s.locationId)) {
            out.add(Ansi.red("取钱得去银行（move 银行）"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("用法：withdraw <金额> 取钱。"));
            return;
        }
        int amt = GameService.parseInt(args[0], 0);
        if (amt <= 0) {
            out.add(Ansi.red("金额无效。"));
            return;
        }
        if (s.character.deposit < amt) {
            out.add(Ansi.red("存款不够（当前 " + s.character.deposit + " 元）。"));
            return;
        }
        s.character.deposit -= amt;
        s.character.money += amt;
        gs.advanceTime(10);
        out.add(Ansi.cyan("🏦 取出 " + amt + " 元，存款余额 " + s.character.deposit + " 元。"));
    }

    // ============ 内部工具 ============

    private static GameConfig.MallItemDef resolveItem(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().mall.size()) return gs.cfg().mall.get(idx - 1);
        return gs.cfg().mall.stream().filter(m -> m.id.equals(arg)).findFirst().orElse(null);
    }
    private static GameConfig.RealEstateDef resolveEstate(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().realestate.size()) return gs.cfg().realestate.get(idx - 1);
        return gs.cfg().realestate.stream().filter(r -> r.id.equals(arg)).findFirst().orElse(null);
    }
    public static void sellCar(GameService gs, List<String> out, String[] args) {
        GameState s = gs.state();
        if (!"carshop".equals(s.locationId)) {
            out.add(Ansi.red("卖车得去 4S 店（move 4S店）"));
            return;
        }
        if (s.ownedCars.isEmpty()) {
            out.add(Ansi.yellow("你还没有车，先 buycar 提一辆吧。"));
            return;
        }
        if (args.length == 0) {
            out.add(Ansi.yellow("你的车库："));
            for (String id : s.ownedCars) {
                GameConfig.CarDef d = resolveCar(gs, id);
                if (d != null) out.add(Ansi.cyan("  " + d.id + " " + d.name + " → 卖出可得 " + (int) (d.cost * 0.6) + " 元"));
            }
            out.add(Ansi.gray("　sellcar <编号或id> 折价 6 折出售，声望会相应减少。"));
            return;
        }
        GameConfig.CarDef d = resolveCar(gs, args[0]);
        if (d == null) {
            out.add(Ansi.red("没有这个车型。"));
            return;
        }
        if (!s.ownedCars.contains(d.id)) {
            out.add(Ansi.yellow("你没有「" + d.name + "」。" + (s.ownedCars.isEmpty() ? "" : " 当前车：sellcar 查看")));
            return;
        }
        int price = (int) (d.cost * 0.6);
        s.ownedCars.remove(d.id);
        s.character.money += price;
        gs.changePrestige(-d.prestige);
        out.add(Ansi.gold("💰 你卖掉了「" + d.name + "」，到手 " + price + " 元。"));
        out.add(Ansi.gray("　声望 -" + d.prestige + "，车钥匙已交回，二手车行笑脸相迎。"));
    }

    private static GameConfig.CarDef resolveCar(GameService gs, String arg) {
        int idx = GameService.parseInt(arg, -1);
        if (idx >= 1 && idx <= gs.cfg().cars.size()) return gs.cfg().cars.get(idx - 1);
        return gs.cfg().cars.stream().filter(c -> c.id.equals(arg)).findFirst().orElse(null);
    }
}
