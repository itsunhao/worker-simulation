package com.cityworker.sim.service;

import com.cityworker.sim.model.GameConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 游戏配置加载器。
 * 优先加载外部 JSON 配置（--game.config-path=... 或运行目录 ./config/game-config.json）；
 * 外部不存在时回退到内置 classpath:config/game-config.json，
 * 并自动把内置配置导出一份到运行目录 ./config/ 供玩家修改。
 */
@Component
public class GameConfigLoader {

    private static final Logger log = LoggerFactory.getLogger(GameConfigLoader.class);

    private final ObjectMapper mapper = new ObjectMapper();
    private GameConfig config;

    @Value("${game.config-path:}")
    private String configPath;

    @PostConstruct
    public void load() throws IOException {
        String external = StringUtils.hasText(configPath) ? configPath : "./config/game-config.json";
        File externalFile = new File(external);
        if (externalFile.exists() && externalFile.isFile()) {
            try (InputStream in = Files.newInputStream(externalFile.toPath())) {
                config = mapper.readValue(in, GameConfig.class);
                log.info("游戏配置已从外部文件加载: {}", externalFile.getAbsolutePath());
                return;
            } catch (IOException e) {
                log.warn("外部配置解析失败，回退内置配置: {}", e.getMessage());
            }
        }
        try (InputStream in = new ClassPathResource("config/game-config.json").getInputStream()) {
            config = mapper.readValue(in, GameConfig.class);
        }
        // 导出内置配置到外部目录，方便玩家自定义
        exportBundled();
        log.info("游戏配置已从内置资源加载，并导出到 ./config/game-config.json");
    }

    private void exportBundled() throws IOException {
        try {
            Path dir = Paths.get("./config");
            Files.createDirectories(dir);
            Path out = dir.resolve("game-config.json");
            if (!Files.exists(out)) {
                try (InputStream in = new ClassPathResource("config/game-config.json").getInputStream()) {
                    Files.copy(in, out);
                }
            }
        } catch (Exception e) {
            log.warn("导出外部配置失败（不影响运行）: {}", e.getMessage());
        }
    }

    public GameConfig get() {
        return config;
    }

    public GameConfig.JobDef job(String id) {
        if (id == null) return null;
        return config.jobs.stream().filter(j -> j.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.CourseDef course(String id) {
        if (id == null) return null;
        return config.courses.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.FoodDef food(String id) {
        if (id == null) return null;
        return config.foods.stream().filter(f -> f.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.HousingDef housing(String id) {
        if (id == null) return null;
        return config.housing.stream().filter(h -> h.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.MallItemDef item(String id) {
        if (id == null) return null;
        return config.mall.stream().filter(m -> m.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.RealEstateDef estate(String id) {
        if (id == null) return null;
        return config.realestate.stream().filter(r -> r.id.equals(id)).findFirst().orElse(null);
    }
    public GameConfig.CarDef car(String id) {
        if (id == null) return null;
        return config.cars.stream().filter(c -> c.id.equals(id)).findFirst().orElse(null);
    }
}
