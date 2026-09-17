package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.repository.ProductRepository;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MemberService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Controller
public class DashboardController {

    private final MemberService memberService;
    private final ProductRepository productRepository;

    public DashboardController(MemberService memberService, ProductRepository productRepository) {
        this.memberService = memberService;
        this.productRepository = productRepository;
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model, @AuthenticationPrincipal CustomUserDetails userDetails) {
        // 사이드바의 "회원관리" 옆에 승인 대기 인원 수를 배지로 보여주기 위한 값입니다.
        model.addAttribute("pendingMemberCount", memberService.getPendingCount());

        // 상단바에 로그인한 회원의 회사명을 보여주기 위한 값입니다.
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());

        // 화면에서 회원 등급별로 판매가1~3 중 하나만 골라 보여주기 위한 값입니다.
        model.addAttribute("memberGrade", userDetails.getMember().getGrade().name());

        // 참고: totalProductCount / bundleCount / importedCount / normalCount는
        // GlobalSidebarStatsAdvice(@ControllerAdvice)가 모든 화면에 공통으로 이미 채워줍니다.
        // 여기서는 대시보드 통계 카드에만 필요한 "오늘/최근" 관련 값들만 추가로 계산합니다.

        // 주의: "어제 대비", "지난주 대비" 같은 증감 수치는 일별 스냅샷을 저장하는 기능이 없어서
        // 아직 계산할 수 없습니다. 대신 지금 시점에 실제로 계산 가능한 값들로 채웠습니다.
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        long todayNewCount = productRepository.countByCreatedAtBetween(todayStart, todayEnd);
        long todayBundleCount = productRepository.countByBundleYnTrueAndCreatedAtBetween(todayStart, todayEnd);
        long todayImportCount = productRepository.countByImportedYnTrueAndCreatedAtBetween(todayStart, todayEnd);
        long todayNormalCount = productRepository.countByCreatedAtBetweenAndBundleYnFalseAndImportedYnFalse(todayStart, todayEnd);

        // "신상품" 카드는 최근 30일, "오늘 신규 등록" 카드는 최근 7일 — 리스트에 뜨는 배지가 사라지는 기준과 동일하게 맞췄습니다.
        long newProductCount = productRepository.countByNewProductYnTrueAndCreatedAtAfter(todayStart.minusDays(30));
        long newRegisteredCount = productRepository.countByNewRegisteredYnTrueAndCreatedAtAfter(todayStart.minusDays(7));

        model.addAttribute("todayNewCount", todayNewCount);
        model.addAttribute("todayBundleCount", todayBundleCount);
        model.addAttribute("todayImportCount", todayImportCount);
        model.addAttribute("todayNormalCount", todayNormalCount);
        model.addAttribute("newProductCount", newProductCount);
        model.addAttribute("newRegisteredCount", newRegisteredCount);

        // templates/dashboard.html 을 렌더링합니다.
        // 상품 테이블 본문은 dashboard.js가 /products/list를 호출해서 채웁니다.
        return "dashboard";
    }
}
