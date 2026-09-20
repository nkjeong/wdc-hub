package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.service.BannerService;
import kr.co.wdchub.sellerdata.service.BannerService.BannerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 배너관리 — 관리자 전용 (상품관리 > 배너관리 탭에서 사용)
 * 슬롯: super-flow(왼쪽 배너), swiper-gl(오른쪽 배너). 배너마다 이미지 최대 5장.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/banners")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBannerController {

    private final BannerService bannerService;

    public record OrderRequest(List<Long> ids) {}

    /** 두 배너의 현재 이미지 목록을 한 번에 조회 */
    @GetMapping
    public Map<String, List<BannerResponse>> list() {
        return bannerService.listAll();
    }

    /** 배너 하나에 이미지 여러 장 업로드 (form 필드명: files) */
    @PostMapping(value = "/{slotKey}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<BannerResponse> upload(@PathVariable String slotKey,
                                       @RequestParam("files") List<MultipartFile> files) {
        return bannerService.addImages(slotKey, files);
    }

    /** 이미지 순서 변경 (슬라이드 순서) */
    @PutMapping("/{slotKey}/order")
    public void reorder(@PathVariable String slotKey, @RequestBody OrderRequest req) {
        bannerService.reorder(slotKey, req.ids());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        bannerService.delete(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
