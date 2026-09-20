package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.MemberGrade;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MemberService;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/admin/members")
public class AdminMemberController {

    private static final int PAGE_SIZE = 10;

    private final MemberService memberService;

    public AdminMemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public String list(@RequestParam(defaultValue = "0") int page,
                        Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        Page<kr.co.wdchub.sellerdata.domain.Member> memberPage = memberService.getMembersPage(page, PAGE_SIZE);

        model.addAttribute("members", memberPage.getContent());
        model.addAttribute("currentPage", page); // 0부터 시작
        model.addAttribute("totalPages", memberPage.getTotalPages());
        model.addAttribute("pendingMemberCount", memberService.getPendingCount());
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/members";
    }

    @PostMapping("/{id}/approve")
    public String approve(@PathVariable Long id, @RequestParam(defaultValue = "0") int page) {
        memberService.approve(id);
        return "redirect:/admin/members?page=" + page;
    }

    @PostMapping("/{id}/reject")
    public String reject(@PathVariable Long id, @RequestParam(defaultValue = "0") int page) {
        memberService.reject(id);
        return "redirect:/admin/members?page=" + page;
    }

    @PostMapping("/{id}/grade")
    public String updateGrade(@PathVariable Long id, @RequestParam MemberGrade grade, @RequestParam(defaultValue = "0") int page) {
        memberService.updateGrade(id, grade);
        return "redirect:/admin/members?page=" + page;
    }
}
