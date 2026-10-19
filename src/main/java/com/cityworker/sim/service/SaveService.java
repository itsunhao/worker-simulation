package com.cityworker.sim.service;

import com.cityworker.sim.model.GameState;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/** 存档服务：GameState <-> JSON 文件，支持 3 个手动槽位 + 自动存档 */
@Service
public class SaveService {

    private static final Logger log = LoggerFactory.getLogger(SaveService.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${game.save-dir:./saves}")
    private String saveDir;

    private Path dir() {
        Path d = Paths.get(saveDir);
        try {
            Files.createDirectories(d);
        } catch (IOException ignored) {}
        return d;
    }

    public void save(GameState state, int slot) throws IOException {
        Path p = dir().resolve("save_" + slot + ".json");
        mapper.writerWithDefaultPrettyPrinter().writeValue(p.toFile(), state);
        log.info("已存档到 {}", p.toAbsolutePath());
    }

    public void autosave(GameState state) throws IOException {
        Path p = dir().resolve("autosave.json");
        mapper.writerWithDefaultPrettyPrinter().writeValue(p.toFile(), state);
    }

    public GameState load(int slot) throws IOException {
        Path p = dir().resolve("save_" + slot + ".json");
        return mapper.readValue(p.toFile(), GameState.class);
    }

    public GameState loadAuto() throws IOException {
        Path p = dir().resolve("autosave.json");
        return mapper.readValue(p.toFile(), GameState.class);
    }

    public boolean hasSlot(int slot) {
        return dir().resolve("save_" + slot + ".json").toFile().exists();
    }
    public boolean hasAuto() {
        return dir().resolve("autosave.json").toFile().exists();
    }

    /** 槽位状态列表（前端标题页/游戏中显示） */
    public List<SlotInfo> slots() {
        List<SlotInfo> list = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            File f = dir().resolve("save_" + i + ".json").toFile();
            SlotInfo s = new SlotInfo();
            s.slot = i;
            s.exists = f.exists();
            s.name = "存档 " + i;
            if (s.exists) {
                try {
                    GameState st = mapper.readValue(f, GameState.class);
                    String jobName = st.jobId != null ? st.jobId : "无业游民";
                    s.summary = (st.character != null ? st.character.name : "无名打工人")
                            + " · " + st.dateStr() + " " + st.timeStr()
                            + " · " + (st.character != null ? st.character.money : 0) + "元"
                            + " · " + jobName
                            + (st.ownedCars != null && !st.ownedCars.isEmpty() ? " · 🚗x" + st.ownedCars.size() : "")
                            + (st.ownedEstates != null && !st.ownedEstates.isEmpty() ? " · 🏠x" + st.ownedEstates.size() : "");
                } catch (IOException e) {
                    s.summary = "存档损坏";
                }
            }
            list.add(s);
        }
        return list;
    }

    public static class SlotInfo {
        public int slot;
        public boolean exists;
        public String name;
        public String summary;
    }
}
