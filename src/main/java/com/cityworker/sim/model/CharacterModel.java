package com.cityworker.sim.model;

/** 打工人角色本体（含动态生命体征与身家） */
public class CharacterModel {
    public String name;
    public String gender;          // male / female
    public String personalityId;
    public String educationId;
    public String majorId;
    public int str, intel, charm, luck;   // 基础技能点
    public int stamina = 100;      // 体力 0-100
    public int hunger = 80;        // 饱腹 0-100
    public int mood = 70;          // 心情 0-100
    public int money;              // 现金
    public int deposit;            // 银行存款
    public int depositStartDay;    // 存款起息日（游戏日）
    public int prestige;           // 声望
    public long createdAt = System.currentTimeMillis();

    /** 总魅力 = 基础魅力 + 穿戴加成 */
    public int charmWithGear(int gearCharm) {
        return Math.max(0, charm + gearCharm);
    }
}
