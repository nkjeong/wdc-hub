package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberGrade;
import kr.co.wdchub.sellerdata.domain.MemberRole;
import kr.co.wdchub.sellerdata.repository.ProductRepository;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/**
 * 여러 화면이 공통으로 필요로 하는 값들을, 화면을 렌더링하는 모든 컨트롤러에
 * 자동으로 채워 넣기 위한 전역 어드바이스입니다.
 *
 * 1) 사이드바의 "상품 데이터" 카운트(전체/번들/수입/일반 상품 수)
 * 2) 상단바 아바타 옆에 표시할 라벨(avatarText) — 관리자면 "관리자",
 *    셀러면 "셀러(등급)" 형태로 로그인한 사람의 실제 역할/등급을 기준으로 자동 계산합니다.
 *    (페이지마다 avatarText='셀' 처럼 하드코딩하던 걸 없애기 위함)
 *
 * 이게 없으면 페이지마다 컨트롤러에서 일일이 값을 채워야 하고, 하나라도 빠뜨리면
 * 그 페이지만 고정값(폴백)을 보여주는 문제가 생깁니다.
 *
 * 참고: JSON만 반환하는 @RestController 요청에도 매번 함께 계산됩니다.
 * 지금 규모에서는 문제없지만, 트래픽이 커지면 캐싱을 고려해야 합니다.
 */
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalSidebarStatsAdvice {

    private final ProductRepository productRepository;

    @ModelAttribute("totalProductCount")
    public long totalProductCount() {
        return productRepository.count();
    }

    @ModelAttribute("bundleCount")
    public long bundleCount() {
        return productRepository.countByBundleYnTrue();
    }

    @ModelAttribute("importedCount")
    public long importedCount() {
        return productRepository.countByImportedYnTrue();
    }

    @ModelAttribute("normalCount")
    public long normalCount() {
        return productRepository.countByBundleYnFalseAndImportedYnFalse();
    }

    @ModelAttribute("avatarText")
    public String avatarText(@AuthenticationPrincipal CustomUserDetails userDetails) {
        // 로그인 전 페이지(로그인/가입 등)에서는 topbar 자체를 안 쓰므로 null이면 그냥 비워둡니다.
        if (userDetails == null || userDetails.getMember() == null) return null;

        Member member = userDetails.getMember();
        if (member.getRole() == MemberRole.ADMIN) {
            return "관리자";
        }

        String gradeLabel = gradeLabel(member.getGrade());
        return "셀러(" + gradeLabel + ")";
    }

    private String gradeLabel(MemberGrade grade) {
        if (grade == null) return "일반";
        return switch (grade) {
            case GOLD -> "GOLD";
            case VIP -> "VIP";
            default -> "일반";
        };
    }
}
