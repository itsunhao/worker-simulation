package com.cityworker.sim.model;

/** 创建角色请求 */
public class StartRequest {
    public String name;
    public String gender;         // male / female
    public String personalityId;
    public String educationId;
    public String majorId;
    public int str, intel, charm, luck;   // 玩家分配的技能点
}
