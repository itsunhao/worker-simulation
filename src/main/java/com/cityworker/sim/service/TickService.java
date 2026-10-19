package com.cityworker.sim.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 游戏心跳：每 tick 推进 1 游戏分钟。
 * 时间刻度 time-scale = 1 游戏分钟 / 现实秒；刻度越大，心跳越快。
 * 默认 1 → 每 1000ms 心跳一次（1 游戏分钟 = 1 现实秒）。
 */
@Component
public class TickService {

    private static final Logger log = LoggerFactory.getLogger(TickService.class);
    private final GameService gameService;
    private ScheduledExecutorService executor;

    public TickService(GameService gameService) {
        this.gameService = gameService;
    }

    @PostConstruct
    public void start() {
        long intervalMs = Math.max(10, 1000L / timeScale);
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "game-tick");
            t.setDaemon(true);
            return t;
        });
        executor.scheduleAtFixedRate(this::tick, intervalMs, intervalMs, TimeUnit.MILLISECONDS);
        log.info("游戏心跳已启动：time-scale={}，心跳间隔 {}ms", timeScale, intervalMs);
    }

    @Value("${game.time-scale:1}")
    private long timeScale;

    private void tick() {
        try {
            gameService.tick();
        } catch (Exception e) {
            log.error("tick 异常", e);
        }
    }

    @PreDestroy
    public void stop() {
        if (executor != null) executor.shutdownNow();
    }
}
