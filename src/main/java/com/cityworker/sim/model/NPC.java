package com.cityworker.sim.model;

/** 社交对象：大街陌生人 / 工作地点的同事 / 恋爱对象 */
public class NPC {
    public String id;
    public String name;
    public String gender;        // male / female
    public int age;
    public String profession;
    public String personality;   // 性格描述
    public int charm;            // 对方魅力
    public int affection;        // 好感度 0-100
    public String relation;      // STRANGER FRIEND CRUSH LOVER FIANCEE SPOUSE
    public String source;        // street / work
    public int lastInteractDay;  // 最近互动游戏日
    public boolean isPartner;    // 是否为当前恋爱/结婚对象
    public boolean isFixed;      // 固定 NPC（工头/房东/老板娘/中介/流浪猫）
    public String role;          // foreman / landlady / madam / agent / cat / shop-<地点>
    public int shopInteractCount; // 当日消费互动次数（限制每日上限）

    public String genderEmoji() {
        return "male".equals(gender) ? "👨" : "👩";
    }
}
