package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MemberService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/members")
public class AdminMemberController {

    private final MemberService memberService;

    public AdminMemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public String list(Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        model.addAttribute("members", memberService.getAllMembersOrderByCreatedAtDesc());
        model.addAttribute("pendingMemberCount", memberService.getPendingCount());
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/members";
    }

    @PostMapping("/{id}/approve")
    public String approve(@PathVariable Long id) {
        memberService.approve(id);
        return "redirect:/admin/members";
    }

    @PostMapping("/{id}/reject")
    public String reject(@PathVariable Long id) {
        memberService.reject(id);
        return "redirect:/admin/members";
    }
}
