package kr.co.wdchub.sellerdata.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    // wdc-hub.co.kr 로 접속했을 때(루트 주소) 대시보드로 보내려고 시도합니다.
    // 로그인이 안 되어 있으면 SecurityConfig 설정에 따라 자동으로 /login 으로 넘어갑니다.
    @GetMapping("/")
    public String home() {
        return "redirect:/dashboard";
    }

    // 로그인 화면(templates/login.html)을 보여줍니다.
    @GetMapping("/login")
    public String login() {
        return "login";
    }
}
