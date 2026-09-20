package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.CardAdDtos.CardAdSaveRequest;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.service.CardAdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대시보드 카드광고(상품 최대 5개를 골라 슬라이드로 보여주는 영역) 관리 — 관리자 전용.
 * 상품관리 화면의 "카드광고1" 탭에서 사용합니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/card-ads")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCardAdController {

    private final CardAdService cardAdService;

    @GetMapping("/{slotKey}")
    public List<ProductResponse> getSlot(@PathVariable String slotKey) {
        return cardAdService.getSlotProducts(slotKey);
    }

    @PutMapping("/{slotKey}")
    public void saveSlot(@PathVariable String slotKey, @RequestBody CardAdSaveRequest req) {
        cardAdService.saveSlotProducts(slotKey, req.productIds());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
