package kr.co.wdchub.sellerdata.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @GetMapping("/dashboard")
    public String dashboard() {
        // templates/dashboard.html 을 렌더링합니다.
        // 나중에 이 자리에서 model.addAttribute("products", productService.findAll()) 처럼
        // DB에서 가져온 데이터를 화면에 넘겨주게 됩니다.
        return "dashboard";
    }
}
