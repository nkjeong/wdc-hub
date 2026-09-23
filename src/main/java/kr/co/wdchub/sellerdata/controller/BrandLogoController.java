package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.Brand;
import kr.co.wdchub.sellerdata.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 브랜드 로고 업로드/삭제 (관리자 전용). 시놀로지 NAS에 저장됩니다.
 * 브랜드의 다른 정보(이름, 제조사 등)를 고치는 API와는 분리된, 로고 전용 엔드포인트입니다.
 * - POST   /admin/brands/{id}/logo : 로고 올리기(있으면 교체) — multipart, 필드 이름 "file"
 * - DELETE /admin/brands/{id}/logo : 로고 지우기
 */
@RestController
@RequestMapping("/admin/brands")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class BrandLogoController {

    private final BrandService brandService;

    public record LogoResponse(String logoImageUrl) {}

    @PostMapping(value = "/{id}/logo", consumes = "multipart/form-data")
    public LogoResponse upload(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        Brand brand = brandService.updateLogo(id, file);
        return new LogoResponse(brand.getLogoImageUrl());
    }

    @DeleteMapping("/{id}/logo")
    public void remove(@PathVariable Long id) {
        brandService.removeLogo(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage()); // NAS 업로드 실패 등
    }
}
