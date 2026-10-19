package com.cityworker.sim.controller;

import com.cityworker.sim.model.CommandResult;
import com.cityworker.sim.model.GameConfig;
import com.cityworker.sim.model.GameState;
import com.cityworker.sim.model.StartRequest;
import com.cityworker.sim.service.GambleActions;
import com.cityworker.sim.service.GameService;
import com.cityworker.sim.service.PhoneActions;
import com.cityworker.sim.service.QuizActions;
import com.cityworker.sim.service.SaveService;
import com.cityworker.sim.service.StockActions;
import com.cityworker.sim.util.Ansi;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 游戏 API */
@RestController
@RequestMapping("/api/game")
public class GameApiController {

    private final GameService game;
    private final SaveService saveService;

    public GameApiController(GameService game, SaveService saveService) {
        this.game = game;
        this.saveService = saveService;
    }

    /** 创建角色并开局 */
    @PostMapping("/start")
    public Map<String, Object> start(@RequestBody StartRequest req) {
        CommandResult r = game.startNewGame(req);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", r.ok);
        m.put("lines", r.lines);
        m.put("hud", game.view());
        return m;
    }

    /** 手机图形界面：chat / video / takeout / order */
    @PostMapping("/phone")
    public Map<String, Object> phone(@RequestBody Map<String, String> body) {
        List<String> lines = new java.util.ArrayList<>();
        Map<String, Object> data = PhoneActions.modal(game, lines, body.getOrDefault("action", "chat"), body.get("foodId"), body.get("npcId"));
        data.put("lines", lines);
        data.put("hud", game.view());
        return data;
    }

    /** 手机炒股：移动端随时随地交易（不受"必须身处交易大厅"限制） */
    @PostMapping("/phone/stock")
    public Map<String, Object> phoneStock(@RequestBody Map<String, String> body) {
        List<String> lines = new java.util.ArrayList<>();
        String side = body.getOrDefault("side", "");
        String code = body.getOrDefault("code", "");
        String shares = body.getOrDefault("shares", "100");
        if ("buy".equalsIgnoreCase(side)) StockActions.buy(game, lines, new String[]{"buy", code, shares});
        else if ("sell".equalsIgnoreCase(side)) StockActions.sell(game, lines, new String[]{"sell", code, shares});
        else lines.add(Ansi.red("未知操作：" + side));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("lines", lines);
        r.put("hud", game.view());
        return r;
    }

    /** 执行终端指令 */
    @PostMapping("/command")
    public Map<String, Object> command(@RequestBody Map<String, String> body) {
        String input = body.getOrDefault("input", "");
        CommandResult r = game.exec(input);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", r.ok);
        m.put("lines", r.lines);
        m.put("hud", game.view());
        return m;
    }

    /** 刮刮乐：刮 1 张（高仿真 UI 调用，结构化返回中奖结果） */
    @PostMapping("/scratch")
    public Map<String, Object> scratch() {
        Map<String, Object> m = new LinkedHashMap<>();
        GameState s = game.state();
        if (!"lottery".equals(s.locationId)) {
            m.put("ok", false);
            m.put("msg", "刮刮乐要去「好运来彩票站」（move 彩票店）");
            return m;
        }
        GameConfig.ScratchDef sc = game.cfg().scratch;
        if (s.character.money < sc.cost) {
            m.put("ok", false);
            m.put("msg", "钱不够买 1 张刮刮乐（需 " + sc.cost + " 元）");
            return m;
        }
        s.character.money -= sc.cost;
        game.advanceTime(5);
        int prize = GambleActions.rollScratch(game, sc, s.character.luck);
        List<String> lines = new java.util.ArrayList<>();
        if (prize == 0) {
            lines.add(Ansi.gray("　谢谢惠顾，再接再厉"));
        } else if (prize >= 100000) {
            lines.add(Ansi.gold("🌟 惊！大奖降临！！+" + prize + " 元！！！"));
            game.pushEvent(Ansi.gold("🌟 刮刮乐大奖：+" + prize + " 元！"));
        } else if (prize >= 1000) {
            lines.add(Ansi.gold("🎉 中大奖了！+" + prize + " 元！！"));
            game.pushEvent(Ansi.gold("🎉 刮刮乐大奖：+" + prize + " 元"));
        } else if (prize >= 100) {
            lines.add(Ansi.green("✨ 中奖！+" + prize + " 元"));
        } else {
            lines.add(Ansi.cyan("　中了 " + prize + " 元，回了一点血"));
        }
        if (prize > 0) s.character.money += prize;
        if (s.character.money < 0) s.character.money = 0;
        m.put("ok", true);
        m.put("prize", prize);
        m.put("cost", sc.cost);
        m.put("won", prize > 0);
        m.put("money", s.character.money);
        m.put("lines", lines);
        m.put("hud", game.view());
        return m;
    }

    /** 创建角色所需的基础配置 */
    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("education", game.cfg().education);
        m.put("personalities", game.cfg().personalities);
        m.put("majors", game.cfg().majors);
        m.put("attributes", game.cfg().attributes);
        // 培训课程：id/名称/学费/门槛/证书 + 当前玩家状态（用于答题选课）
        List<Map<String, Object>> cs = new java.util.ArrayList<>();
        if (game.state() != null && game.state().started) {
            for (com.cityworker.sim.model.GameConfig.CourseDef c : game.cfg().courses) {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("id", c.id);
                cm.put("name", c.name);
                cm.put("cost", c.cost);
                cm.put("hours", c.hours);
                cm.put("examFee", c.examFee);
                cm.put("minIntel", c.minIntel);
                cm.put("certName", c.certName);
                cm.put("desc", c.desc);
                cm.put("done", game.state().certificates.contains(c.certId));
                cm.put("progress", game.state().courseProgress.containsKey(c.id)
                        ? game.state().courseProgress.get(c.id) : null);
                cs.add(cm);
            }
        }
        m.put("courses", cs);
        // 成人大学班级（含玩家状态）
        List<Map<String, Object>> ac = new java.util.ArrayList<>();
        if (game.state() != null && game.state().started && game.cfg().adultClasses != null) {
            for (com.cityworker.sim.model.GameConfig.AdultClassDef cd : game.cfg().adultClasses) {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("id", cd.id);
                cm.put("name", cd.name);
                cm.put("icon", cd.icon == null ? "🎓" : cd.icon);
                cm.put("desc", cd.desc);
                cm.put("cost", cd.cost);
                cm.put("examFee", cd.examFee);
                cm.put("minIntel", cd.minIntel);
                cm.put("hours", cd.hours);
                cm.put("fromEducation", cd.fromEducation);
                cm.put("toEducation", cd.toEducation);
                cm.put("major", cd.major);
                cm.put("graduated", game.state().collegeGraduated.contains(cd.id));
                cm.put("progress", game.state().collegeProgress.containsKey(cd.id)
                        ? game.state().collegeProgress.get(cd.id) : null);
                ac.add(cm);
            }
        }
        m.put("adultClasses", ac);
        m.put("businesses", game.cfg().businesses);
        m.put("wholesale", game.cfg().wholesale);
        m.put("cars", game.cfg().cars);
        m.put("realestate", game.cfg().realestate);
        // ---- UI 化场景补充数据 ----
        m.put("mall", game.cfg().mall);
        m.put("foods", game.cfg().foods);
        m.put("housing", game.cfg().housing);
        m.put("scratch", game.cfg().scratch);
        m.put("lottery", game.cfg().lottery);
        m.put("homeItems", game.cfg().homeItems);
        // 招聘：职位 + 玩家满足状态
        List<Map<String, Object>> jl = new java.util.ArrayList<>();
        if (game.state() != null && game.state().started) {
            Map<String, String> certName = new java.util.HashMap<>();
            for (com.cityworker.sim.model.GameConfig.CourseDef c : game.cfg().courses) {
                certName.put(c.certId, c.certName);
            }
            for (com.cityworker.sim.model.GameConfig.JobDef j : game.cfg().jobs) {
                Map<String, Object> jm = new LinkedHashMap<>();
                jm.put("id", j.id);
                jm.put("name", j.name);
                jm.put("type", j.type);
                jm.put("desc", j.desc);
                jm.put("daily", j.daily);
                jm.put("growAttr", j.growAttr);
                jm.put("icon", j.icon == null ? "💼" : j.icon);
                java.util.List<String> reqs = new java.util.ArrayList<>();
                String miss = null;
                if (j.minEducation != null && !j.minEducation.isBlank()) {
                    String eName = game.cfg().education.stream().filter(e -> j.minEducation.equals(e.id))
                            .findFirst().map(e -> e.name).orElse(j.minEducation);
                    reqs.add("学历≥" + eName);
                    if (miss == null && (game.state().character.educationId == null
                            || com.cityworker.sim.model.GameConfig.educationRank(game.state().character.educationId)
                               < com.cityworker.sim.model.GameConfig.educationRank(j.minEducation))) miss = "学历不足";
                }
                if (j.minStr > 0) { reqs.add("力量≥" + j.minStr); if (game.state().character.str < j.minStr && miss == null) miss = "力量不足"; }
                if (j.minIntel > 0) { reqs.add("智力≥" + j.minIntel); if (game.state().character.intel < j.minIntel && miss == null) miss = "智力不足"; }
                if (j.minCharm > 0) { reqs.add("魅力≥" + j.minCharm); if (game.gearCharm() < j.minCharm && miss == null) miss = "魅力不足"; }
                if (j.minPrestige > 0) { reqs.add("声望≥" + j.minPrestige); if (game.gearPrestige() < j.minPrestige && miss == null) miss = "声望不足"; }
                if (j.requiredCertificate != null) {
                    String cn = certName.getOrDefault(j.requiredCertificate, j.requiredCertificate);
                    reqs.add("证书：" + cn);
                    if (!game.state().certificates.contains(j.requiredCertificate) && miss == null) miss = "缺证书";
                }
                if (j.requiredCerts != null) {
                    StringBuilder cb = new StringBuilder("证书：");
                    for (int k = 0; k < j.requiredCerts.size(); k++) {
                        if (k > 0) cb.append(" + ");
                        cb.append(certName.getOrDefault(j.requiredCerts.get(k), j.requiredCerts.get(k)));
                        if (!game.state().certificates.contains(j.requiredCerts.get(k)) && miss == null) miss = "缺证书";
                    }
                    reqs.add(cb.toString());
                }
                if (j.requiredOutfit != null) {
                    reqs.add("着装：" + j.requiredOutfit);
                    if (!game.state().equipped.contains(j.requiredOutfit) && !game.state().inventory.contains(j.requiredOutfit) && miss == null) miss = "缺着装";
                }
                jm.put("reqs", reqs);
                jm.put("miss", miss);
                jm.put("satisfied", miss == null);
                jm.put("current", j.id.equals(game.state().jobId));
                jl.add(jm);
            }
        }
        m.put("jobs", jl);
        // 成就：全部 + 解锁状态
        List<Map<String, Object>> al = new java.util.ArrayList<>();
        if (game.state() != null && game.state().started) {
            for (com.cityworker.sim.model.GameConfig.AchievementDef a : game.cfg().achievements) {
                Map<String, Object> am = new LinkedHashMap<>();
                am.put("id", a.id);
                am.put("name", a.name);
                am.put("desc", a.desc);
                am.put("icon", a.icon == null ? "🏆" : a.icon);
                am.put("unlocked", game.state().achievements.contains(a.id));
                al.add(am);
            }
        }
        m.put("achievements", al);
        return m;
    }

    /** 轮询状态：返回 HUD + 挂起的随机事件行 */
    @GetMapping("/state")
    public Map<String, Object> state() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hud", game.view());
        m.put("lines", game.drainEvents());
        return m;
    }

    /** SSE 实时推送：状态变更（tick/指令/存档等）主动推送给前端，替代高频轮询 */
    @GetMapping(value = "/stream", produces = "text/event-stream")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter stream() {
        return game.openSse();
    }

    /** 培训出题：mode=study（1 题） / exam（全部题目） */
    @PostMapping("/quiz")
    public Map<String, Object> quiz(@RequestBody Map<String, String> body) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (game.state() == null || !game.state().started) {
            m.put("ok", false);
            m.put("msg", "游戏尚未开始");
            return m;
        }
        String courseId = body.get("courseId");
        String mode = body.getOrDefault("mode", "study");
        Map<String, Object> q = QuizActions.issue(game, courseId, mode);
        if (q == null) {
            m.put("ok", false);
            m.put("msg", "课程不存在或题库为空");
            return m;
        }
        if (Boolean.FALSE.equals(q.get("ok"))) return q;   // 出题失败（err Map）
        q.put("ok", true);
        return q;
    }

    /** 答题判定 */
    @PostMapping("/quiz/answer")
    public Map<String, Object> quizAnswer(@RequestBody Map<String, Object> body) {
        String quizId = (String) body.get("quizId");
        @SuppressWarnings("unchecked")
        List<Integer> answers = (List<Integer>) body.get("answers");
        Map<String, Object> r = QuizActions.judge(game, quizId, answers);
        return r;
    }

    @PostMapping("/pause")
    public Map<String, Object> pause(@RequestBody Map<String, Object> body) {
        boolean paused = Boolean.TRUE.equals(body.get("paused"));
        game.setPaused(paused);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("hud", game.view());
        return m;
    }

    @PostMapping("/save")
    public Map<String, Object> save(@RequestBody Map<String, Object> body) {
        int slot = body.get("slot") instanceof Number n ? n.intValue() : 1;
        CommandResult r = game.saveGame(slot);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", r.ok);
        m.put("lines", r.lines);
        m.put("hud", game.view());
        return m;
    }

    @PostMapping("/load")
    public Map<String, Object> load(@RequestBody Map<String, Object> body) {
        int slot = body.get("slot") instanceof Number n ? n.intValue() : 1;
        CommandResult r = game.loadGame(slot);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", r.ok);
        m.put("lines", r.lines);
        m.put("hud", game.view());
        return m;
    }

    @GetMapping("/slots")
    public Map<String, Object> slots() {
        Map<String, Object> m = new LinkedHashMap<>();
        List<SaveService.SlotInfo> list = saveService.slots();
        m.put("ok", true);
        m.put("slots", list);
        m.put("hasAuto", saveService.hasAuto());
        return m;
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        game.resetGame();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        return m;
    }

    /** 公园 21 点：action = start | hit | stand | double，bet 仅 start 使用 */
    @PostMapping("/bj")
    public Map<String, Object> bj(@RequestBody Map<String, Object> body) {
        List<String> out = new java.util.ArrayList<>();
        String action = body.getOrDefault("action", "start").toString();
        Object bet = body.get("bet");
        String[] args;
        if ("start".equals(action)) {
            args = new String[]{ bet == null ? "100" : bet.toString() };
        } else {
            args = new String[]{ action };
        }
        com.cityworker.sim.service.ParkActions.bj(game, out, args);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("lines", out);
        m.put("hud", game.view());
        return m;
    }

    /** 公园五子棋：action = start | move | view，move 带 row/col（0-14 或 1-15 均可） */
    /** 工作小游戏结算：score 0-100 完成度 */
    @PostMapping("/work")
    public Map<String, Object> work(@RequestBody Map<String, Object> body) {
        int score = body.get("score") instanceof Number n ? n.intValue() : 50;
        List<String> out = new java.util.ArrayList<>();
        com.cityworker.sim.service.JobActions.workFinish(game, out, score);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("lines", out);
        m.put("hud", game.view());
        return m;
    }

    @PostMapping("/gomoku")
    public Map<String, Object> gomoku(@RequestBody Map<String, Object> body) {
        List<String> out = new java.util.ArrayList<>();
        String action = body.getOrDefault("action", "start").toString();
        String[] args;
        if ("move".equals(action)) {
            Object r = body.get("row"), c = body.get("col");
            int row = r == null ? 0 : (int) Double.parseDouble(r.toString());
            int col = c == null ? 0 : (int) Double.parseDouble(c.toString());
            // 允许 1-15 与 0-14 两种坐标
            if (row >= 1 && row <= 15) row -= 1;
            if (col >= 1 && col <= 15) col -= 1;
            args = new String[]{ "put", String.valueOf(row), String.valueOf(col) };
        } else if ("view".equals(action)) {
            args = new String[]{ "view" };
        } else {
            Object bet = body.get("bet");
            args = new String[]{ bet == null ? "100" : bet.toString() };
        }
        com.cityworker.sim.service.ParkActions.gomoku(game, out, args);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("lines", out);
        m.put("hud", game.view());
        return m;
    }
}
