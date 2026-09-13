package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MemberService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final MemberService memberService;

    public DashboardController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        // 사이드바의 "회원관리" 옆에 승인 대기 인원 수를 배지로 보여주기 위한 값입니다.
        model.addAttribute("pendingMemberCount", memberService.getPendingCount());

        // 상단바에 로그인한 회원의 회사명을 보여주기 위한 값입니다.
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());

        // templates/dashboard.html 을 렌더링합니다.
        // 나중에 이 자리에서 model.addAttribute("products", productService.findAll()) 처럼
        // DB에서 가져온 데이터를 화면에 넘겨주게 됩니다.
        return "dashboard";
    }
}
