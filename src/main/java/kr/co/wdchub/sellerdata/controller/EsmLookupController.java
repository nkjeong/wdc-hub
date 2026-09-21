package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.EsmDtos.CategoryDetail;
import kr.co.wdchub.sellerdata.dto.EsmDtos.CategoryHit;
import kr.co.wdchub.sellerdata.dto.EsmDtos.NodeDto;
import kr.co.wdchub.sellerdata.dto.EsmDtos.OriginDto;
import kr.co.wdchub.sellerdata.service.EsmLookupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 상품 등록/수정 화면의 G마켓 카테고리·원산지 선택용 조회 API (관리자 전용).
 * - GET /admin/esm/category-children?parent=식품>신선식품 : 바로 아래 단계 목록 (parent 없으면 1차)
 * - GET /admin/esm/category-search?keyword=텀블러         : 이름 검색
 * - GET /admin/esm/category/{esmCode}                     : 경로 + 대응하는 G마켓 카테고리 목록
 * - GET /admin/esm/origins                                : 원산지 전체
 */
@RestController
@RequestMapping("/admin/esm")
@PreAuthorize("hasRole('ADMIN')")
public class EsmLookupController {

    private final EsmLookupService lookupService;

    public EsmLookupController(EsmLookupService lookupService) {
        this.lookupService = lookupService;
    }

    @GetMapping("/category-children")
    public List<NodeDto> children(@RequestParam(required = false) String parent) {
        return lookupService.children(parent);
    }

    @GetMapping("/category-search")
    public List<CategoryHit> search(@RequestParam String keyword) {
        return lookupService.search(keyword);
    }

    @GetMapping("/category/{esmCode}")
    public CategoryDetail detail(@PathVariable String esmCode) {
        return lookupService.detail(esmCode);
    }

    @GetMapping("/origins")
    public List<OriginDto> origins() {
        return lookupService.origins();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }
}
