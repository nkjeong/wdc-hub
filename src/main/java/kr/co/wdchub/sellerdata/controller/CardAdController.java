package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.service.CardAdService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 카드광고 조회 — 로그인한 모든 회원(셀러+관리자) 접근 가능. 대시보드의 카드광고 슬라이드에서 사용합니다.
 * 선택 관리는 AdminCardAdController("/admin/card-ads")를 사용하세요.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/card-ads")
public class CardAdController {

    private final CardAdService cardAdService;

    @GetMapping("/{slotKey}")
    public List<ProductResponse> getSlot(@PathVariable String slotKey) {
        return cardAdService.getSlotProducts(slotKey);
    }
}
