package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.BrandDtos.*;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 브랜드(제조사/수입사) 관리 — 관리자 전용
 * SecurityConfig에서 "/admin/**" 경로 전체가 hasRole('ADMIN')으로 이미 보호되지만,
 * 메서드 레벨에도 @PreAuthorize를 걸어 이중으로 방어합니다.
 * 회원 누구나 보는 브랜드 목록은 BrandCatalogController("/brands")를 사용하세요.
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/brands")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrandController {

    private final BrandService brandService;

    @GetMapping
    public String brandManagementPage(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/brands"; // templates/admin/brands.html (추후 제작)
    }

    @GetMapping("/list")
    @ResponseBody
    public List<BrandResponse> listBrands() {
        return brandService.getAllBrands().stream()
                .map(brandService::toResponse)
                .toList();
    }

    @PostMapping
    @ResponseBody
    public BrandResponse createBrand(@RequestBody BrandCreateRequest req) {
        return brandService.toResponse(brandService.createBrand(req));
    }

    @PutMapping("/{id}")
    @ResponseBody
    public void updateBrand(@PathVariable Long id, @RequestBody BrandUpdateRequest req) {
        brandService.updateBrand(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public void deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
    }

    // ── 예외 처리 ──────────────────────────────
    // "존재하지 않는 카테고리입니다" 같은 메시지를 프론트(alert)에 그대로 보여주기 위함

    @ExceptionHandler(IllegalStateException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
