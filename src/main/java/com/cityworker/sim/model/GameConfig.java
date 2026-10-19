package com.cityworker.sim.model;

import java.util.List;

/**
 * 游戏外部配置（由 game-config.json 反序列化而来）。
 * 字段与 JSON 一一对应。
 */
public class GameConfig {
    public String version;
    public List<EducationDef> education;
    public List<PersonalityDef> personalities;
    public List<MajorDef> majors;
    public List<AttributeDef> attributes;
    public List<LocationDef> locations;
    public List<JobDef> jobs;
    public List<CourseDef> courses;
    public List<AdultClassDef> adultClasses;   // 成人大学学历班级
    public List<FoodDef> foods;
    public List<HousingDef> housing;
    public List<MallItemDef> mall;
    public List<RealEstateDef> realestate;
    public List<CarDef> cars;
    public ScratchDef scratch;
    public LotteryDef lottery;
    public NpcNamesDef npcNames;
    public List<String> npcProfessions;
    public List<EventDef> events;
    public List<AchievementDef> achievements;
    public List<BusinessDef> businesses;
    public List<StockDef> stocks;
    public List<WholesaleDef> wholesale;
    public List<HomeItemDef> homeItems;

    public static class StockDef {
        public String code, name, sector, icon, desc;
        public double basePrice, volatility;
    }

    public static class EducationDef {
        public String id, name, desc;
        public int points, str, intel, charm, luck;
    }

    /** 学历等级顺序：primary < middle < high < college < bachelor */
    public static final List<String> EDUCATION_ORDER =
            List.of("primary", "middle", "high", "college", "bachelor");

    public static int educationRank(String id) {
        if (id == null) return -1;
        return EDUCATION_ORDER.indexOf(id);
    }

    public static class PersonalityDef {
        public String id, name, desc;
        public int str, intel, charm, luck, stamina, mood;
        public double socialBonus, workBonus, learnBonus, riskBonus;
    }

    public static class MajorDef {
        public String id, name, desc, courseAffinity;
        public int str, intel, charm, luck;
    }

    public static class AttributeDef {
        public String id, name, icon, desc;
    }

    public static class LocationDef {
        public String id, name, icon, img, desc;
    }

    public static class JobDef {
        public String id, name, type, desc, icon, requiredCertificate, requiredOutfit;
        public int daily, minStr, minIntel, minCharm, minPrestige, staminaPerHour;
        public double transportBonus;
        public String growAttr;   // 工作积累提升的属性：str / intel / charm / luck
        public String minEducation;   // 最低学历要求：primary/middle/high/college/bachelor
        public java.util.List<String> requiredCerts;  // 多证书叠加要求（全部需持有）
    }

    /** 成人大学学历班级：报名 → 学习 → 毕业考试（全对）→ 学历升级 + 专业方向 */
    public static class AdultClassDef {
        public String id, name, desc, icon;
        public int cost, examFee, minIntel;      // 学费 / 考务费 / 智力门槛
        public int hours;                        // 参考学时（展示用）
        public String fromEducation;             // 要求当前学历等级（含）
        public String toEducation;               // 毕业后学历（升级为）
        public String major;                     // 毕业专业方向（可空，不改变专业）
        public List<QuizQ> questions;            // 毕业考试题库（选择/判断）
    }

    public static class CourseDef {
        public String id, name, certId, certName, certIcon, desc;
        public int cost, hours, examFee, minIntel;
        public List<QuizQ> questions;   // 培训答题题库（选择/判断）
    }

    public static class QuizQ {
        public String q;
        public String type;      // choice / judge
        public List<String> options;
        public int answer;       // 正确选项索引
    }

    public static class FoodDef {
        public String id, name, place, desc, icon;
        public int cost, hunger, stamina, mood, prestige;
    }

    public static class HousingDef {
        public String id, name, desc;
        public int costPerNight, leaseCost, leaseDays, restore, mood, prestige;
        public double risk;
    }

    public static class MallItemDef {
        public String id, name, category, desc;
        public int cost, charm, prestige, mood;
        public double socialBonus;
    }

    /** 家居电器：电视/电脑/家电/家具 */
    public static class HomeItemDef {
        public String id, name, brand, category, desc;
        public int cost, charm, prestige, mood, restore, level;
        public List<String> unlock = new java.util.ArrayList<>();   // 解锁的能力（电脑/电视）
    }

    public static class RealEstateDef {
        public String id, name, desc;
        public int cost, prestige, passiveIncome;
    }

    public static class CarDef {
        public String id, name, desc;
        public int cost, prestige;
        public double deliveryBonus, socialBonus;
    }

    public static class ScratchDef {
        public int cost;
        public double winChance;
        public double jackpotChance;   // 中大奖（≥1000元）概率
        public int jackpotMax;         // 头奖上限（5000000）
        public List<ScratchPrize> prizes;
        public List<ScratchPrize> jackpots;
    }

    public static class ScratchPrize {
        public int amount;
        public double weight;
    }

    public static class LotteryDef {
        public int costPerTicket, drawHour, drawMinute;
        public List<LotteryPrize> prizes;
    }

    public static class LotteryPrize {
        public int match;
        public boolean plusBlue;
        public int amount;
    }

    /** 小商品批发：摆地摊的货源 */
    public static class WholesaleDef {
        public String id, name, icon, unit, desc;
        public int price;      // 批发价（元/单位）
        public int sellBase;   // 摆摊基准售价（元/单位）
        public int stock;      // 每单位包含件数
    }

    public static class NpcNamesDef {
        public List<String> surnames, male, female;
    }

    public static class EventDef {
        public String id, desc, requiresLocation;
        public int weight, moneyMin, moneyMax, stamina, mood, hunger, learnProgress;
        public boolean requiresJob;
        public double luckEffect;
    }

    public static class AchievementDef {
        public String id, name, desc, type, icon;
        public String value;   // 数值（数字或教育等级 id，按 type 解释）
    }

    public static class BusinessDef {
        public String id, name, icon, desc;
        public int cost;        // 启动资金
        public int minPrestige; // 声望门槛
        public int baseIncome;  // 日收益基础
        public int stamina;     // 每日经营体力消耗
    }
}
