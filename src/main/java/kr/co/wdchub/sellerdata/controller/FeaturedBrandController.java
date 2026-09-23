package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.service.FeaturedBrandService;
import kr.co.wdchub.sellerdata.service.FeaturedBrandService.FeaturedBrandDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대시보드 "주요 브랜드" 영역.
 * - GET /featured-brands                : 회원 대시보드가 부릅니다. 로그인만 되어 있으면 누구나 조회 가능.
 * - GET /admin/featured-brands          : 관리자 화면에서 지금 선택된 브랜드 id 목록(순서대로)
 * - PUT /admin/featured-brands          : 선택 저장 (본문: 브랜드 id 배열, 체크한 순서 그대로)
 */
@RestController
@RequiredArgsConstructor
public class FeaturedBrandController {

    private final FeaturedBrandService featuredBrandService;

    @GetMapping("/featured-brands")
    public List<FeaturedBrandDto> forDashboard() {
        return featuredBrandService.getForDashboard();
    }

    @GetMapping("/admin/featured-brands")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Long> selected() {
        return featuredBrandService.getSelectedBrandIds();
    }

    @PutMapping("/admin/featured-brands")
    @PreAuthorize("hasRole('ADMIN')")
    public void save(@RequestBody List<Long> brandIds) {
        featuredBrandService.replace(brandIds);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
