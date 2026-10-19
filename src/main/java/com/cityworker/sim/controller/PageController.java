package com.cityworker.sim.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/** 页面路由 */
@Controller
public class PageController {

    @GetMapping("/")
    public String index(Model model) {
        return "index";
    }

    @GetMapping("/game")
    public String game(Model model) {
        return "game";
    }

    @GetMapping("/free")
    public String free(Model model) {
        return "free";
    }

    @GetMapping("/room")
    public String room(Model model) {
        return "room";
    }
}
