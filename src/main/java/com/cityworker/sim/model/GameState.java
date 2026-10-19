package com.cityworker.sim.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 完整游戏状态（可整体序列化为存档 JSON） */
public class GameState {
    public boolean started;
    public boolean gameOver;
    public String gameOverReason;

    public long gameMinutes = 480;      // 第1天 08:00
    public String locationId = "street";
    public CharacterModel character;

    public String jobId;                // 当前职业
    public int jobCount;                // 累计入职次数
    public long totalEarned;            // 累计打工收入
    public int scrapCount;              // 累计捡废品次数

    public List<String> certificates = new ArrayList<>();
    public Map<String, Double> courseProgress = new HashMap<>();   // courseId -> 熟练度 0-100
    public List<String> inventory = new ArrayList<>();             // 已购物品 id
    public List<String> equipped = new ArrayList<>();              // 穿戴中的物品 id（衣服/裤子/手表/数码）
    public Map<String, Integer> wholesaleStock = new HashMap<>();  // 批发商品库存：商品id -> 单位数

    public BlackjackGame blackjack;   // 公园 21 点牌局
    public GomokuGame gomoku;         // 公园五子棋对局
    public int parkBjWins;            // 21点累计胜局（成就）
    public int parkGomokuWins;        // 五子棋累计胜局（成就）
    public int nightMarketVisits;     // 夜市消费次数（成就）
    public int ghostMarketVisits;     // 鬼市消费次数（成就）
    public int certCount;             // 获得证书数（成就）
    public int newGameCount;          // 新周目次数（成就）

    public List<String> ownedEstates = new ArrayList<>();
    public List<String> ownedCars = new ArrayList<>();
    public List<String> homeItems = new ArrayList<>();   // 已购买的家电/家具 id
    public String housingId = "street";  // 当前睡觉方式
    public int leaseDays;                // 月租房剩余天数

    public List<NPC> npcs = new ArrayList<>();
    public String partnerId;             // 恋爱/未婚妻/配偶的 NPC id
    public boolean married;

    // 创业开店：当前店铺
    public String bizId;                 // 店铺 id
    public int bizLevel = 1;
    public long bizRevenue = 0;          // 累计营收
    public int bizOpenedDay = -1;
    public int bizLastRunDay = -1;

    public boolean wonBigLottery;        // 是否中过大奖（成就）
    public int lotteryPending;           // 待开奖的双色球注数
    public Set<String> achievements = new HashSet<>();

    public List<String> eventQueue = new ArrayList<>();  // 待推送给前端的终端行（含ANSI）
    public List<String> eventLog = new ArrayList<>();    // 最近事件日志（纯文本）

    public boolean paused;
    public int speed = 1;

    // 属性自然流逝累加器（单位：游戏分钟，tick 每 1 分钟推进）
    public int hungerTick;     // 饱腹：每 18 分钟 -1
    public int starveTick;     // 饿到掉体力：每 20 分钟 -1
    public int hungryMoodTick; // 饿着心情差：每 30 分钟 -1
    public int moodTick;       // 心情自然消磨：每 90 分钟 -1
    public int recoverTick;    // 吃饱回体力：每 90 分钟 +1

    // 股票市场
    public List<StockQuote> market = new ArrayList<>();
    public List<StockHolding> holdings = new ArrayList<>();
    public int stockTick;      // 股价波动累加器（每 30 分钟一次）

    // 健康
    public boolean sick;       // 生病（感冒/拉肚子）：体力恢复减半、持续掉心情
    public int sickTick;       // 生病恶化累加器
    public String sickName = "";

    // 中介推荐：下次入职薪资 ×(1+referBonus)
    public double referBonus = 0;
    public int fedCatDays;     // 累计喂流浪猫天数（成就）
    public int lastFeedDay = -1;
    public int workGrowCount;  // 累计工作天数（每 2 天提升一次主属性）
    public int lastExerciseDay = -1;  // 锻炼成长日（每 2 天 +1 体力）
    public int lastReadDay = -1;      // 读书成长日（每 2 天 +1 智力）
    public int lastPrayDay = -1;      // 祈福成长日（每 3 天 +1 运气）
    public int lastDonateDay = -1;    // 行善成长日（每 2 天 +1 运气）
    public int lastMeditateDay = -1;   // 冥想成长日（每 2 天 +1 智力）
    public int lastPracticeDay = -1;   // 练球成长日（每 3 天 +1 运气）
    public int lastWorshipDay = -1;    // 拜财神成长日（每 3 天 +1 运气）
    public String pendingQuiz;        // 进行中的答题会话 id
    public QuizMeta pendingQuizMeta;  // 答题会话元信息

    // 电脑应用每日限制（按游戏日）
    public int lastVideoDay = -1, videoCount;
    public int lastGameDay = -1, gameCount;
    public int lastLiveDay = -1;
    public int lastCodeDay = -1, codeCount;
    public int lastChatDay = -1;
    public int lastAiDay = -1;

    // ---- v1.9 都市生活充实包 ----
    public String weatherId = "sunny";        // 天气：sunny/cloudy/light_rain/heavy_rain/snow
    public int loanPrincipal;                 // 银行贷款本金
    public int loanStartDay = -1;             // 贷款起始日（计息日）
    public int financePrincipal;              // 银行理财本金（锁定 7 天）
    public int financeStartDay = -1;          // 理财起息日
    public List<Quest> quests = new ArrayList<>();   // 每日任务
    public int questDay = -1;                 // 任务刷新日
    public int questCount;                    // 累计完成任务数（成就）
    public int balloonWins;                   // 打气球单局全中次数（成就）
    public int goldfishGot;                   // 捞到金鱼次数（成就）
    public int matchCount;                    // 相亲角结识成功次数（成就）
    public int lastMatchDay = -1;             // 相亲角每日限次
    public int lastGigDay = -1;               // 打零工每日限次
    public int gigCount;                      // 当日打零工次数（每天 2 次）
    public int lastArrangeDay = -1;           // 上次学插花日期（每 3 天 +1 魅力）

    // ---- v2.0 成人大学 ----
    public Map<String, Double> collegeProgress = new HashMap<>();  // 成人班级 id -> 熟练度 0-100
    public List<String> collegeGraduated = new ArrayList<>();      // 已毕业的成人班级 id
    public int npcHelpCount;                  // 帮过 NPC 的次数（好感提升/成就）
    public int lastCookDay = -1;              // 住处做饭每日限次
    public int pendingAdultFee;               // 成人大学考试已扣考务费（结算用）
    public String pendingAdultExam;           // 终端进行中的成人毕业考试班级 id（等待 college answer）
    public Map<String, Integer> npcDebt = new HashMap<>();  // 欠 NPC 的钱：npcId -> 金额
    public int learnCount;                    // 向 NPC 请教的累计次数
    public int studyLottoStreak;              // 彩票走势研究连击（彩蛋）

    // ---- v2.2 娱乐场所 / 车辆互动 / 婚姻生活 ----
    public Map<String, Integer> entAffection = new HashMap<>();  // 娱乐NPC好感：陪侍/技师 id -> 0-100
    public Map<String, Integer> entChatDay = new HashMap<>();    // 娱乐NPC每日交流限次：id -> 今日次数
    public int ktvVisits;                     // KTV 消费次数（成就）
    public int pvclubVisits;                  // 私人会所消费次数（成就）
    public int marriedDay = -1;               // 结婚日期（婚后生活加成）
    public int carDriveCount;                 // 累计用车次数（成就）
    public int carTaxiEarn;                   // 黑车拉客累计收入（成就）
    public int carRaceCount;                  // 飙车次数（成就）

    /** 每日任务条目 */
    public static class Quest {
        public String id;
        public String desc;      // 任务描述
        public String type;      // work/study/scrap/stall/exercise/read/talk/eat/donate/night/pray/sign
        public int target;       // 目标次数
        public int cur;          // 当前进度
        public boolean done;     // 是否已完成
        public int reward;       // 现金奖励
        public int mood;         // 完成心情奖励
    }

    public static class StockQuote {
        public String code, name, sector, icon, desc;
        public double price, dayOpen, volatility;
        public List<Double> history = new ArrayList<>();

        public double dayChangePct() {
            if (dayOpen <= 0) return 0;
            return (price - dayOpen) / dayOpen * 100;
        }
    }

    public static class StockHolding {
        public String code;
        public int shares;
        public double totalCost;
    }

    public int day() {
        return (int) (gameMinutes / 1440) + 1;
    }
    public int minuteOfDay() {
        return (int) (gameMinutes % 1440);
    }
    public int hour() { return minuteOfDay() / 60; }
    public int minute() { return minuteOfDay() % 60; }

    public String timeStr() {
        return String.format("%02d:%02d", hour(), minute());
    }
    public String dateStr() {
        return "第" + day() + "天";
    }
    public String fullTimeStr() {
        return "第" + day() + "天 " + timeStr();
    }
}
