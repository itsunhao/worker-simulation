package com.cityworker.sim.model;

/** 答题会话元信息 */
public class QuizMeta {
    public String courseId;
    public String mode;
    public int qIndex;

    public QuizMeta() {}

    public QuizMeta(String courseId, String mode, int qIndex) {
        this.courseId = courseId;
        this.mode = mode;
        this.qIndex = qIndex;
    }
}
