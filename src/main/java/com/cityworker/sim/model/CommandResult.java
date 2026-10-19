package com.cityworker.sim.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 指令执行结果：终端输出行 + 最新状态视图 */
public class CommandResult {
    public boolean ok;
    public List<String> lines = new ArrayList<>();   // 终端行（可含 ANSI）
    public Map<String, Object> view;

    public static CommandResult of(List<String> lines, Map<String, Object> view) {
        CommandResult r = new CommandResult();
        r.ok = true;
        r.lines = lines;
        r.view = view;
        return r;
    }

    public static CommandResult fail(String msg, Map<String, Object> view) {
        CommandResult r = new CommandResult();
        r.ok = false;
        r.lines.add(msg);
        r.view = view;
        return r;
    }
}
