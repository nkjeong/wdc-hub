package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.CardAdItem;
import kr.co.wdchub.sellerdata.domain.Product;
import kr.co.wdchub.sellerdata.dto.ProductDtos.ProductResponse;
import kr.co.wdchub.sellerdata.repository.CardAdItemRepository;
import kr.co.wdchub.sellerdata.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 대시보드 카드광고(슬롯별로 상품 최대 5개를 골라서 슬라이드로 보여주는 기능)의 조회/저장을 담당합니다.
 * slotKey로 광고 영역을 구분합니다 (지금은 "card-ad-1" 하나만 쓰지만, 나중에 광고 영역이 늘어나도
 * 같은 구조를 그대로 재사용할 수 있습니다).
 */
@Service
@RequiredArgsConstructor
public class CardAdService {

    private static final int MAX_ITEMS_PER_SLOT = 5;

    private final CardAdItemRepository cardAdItemRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    /** 슬롯에 등록된 상품들을 슬라이드 순서대로 반환합니다 (회원 대시보드/관리자 화면 공용) */
    public List<ProductResponse> getSlotProducts(String slotKey) {
        return cardAdItemRepository.findBySlotKeyOrderBySortOrderAsc(slotKey).stream()
                .map(item -> productService.toResponse(item.getProduct()))
                .toList();
    }

    /**
     * 슬롯의 상품 목록을 통째로 교체합니다 (기존 선택은 지우고 새로 받은 순서대로 다시 저장).
     * 최대 5개까지만 허용합니다.
     */
    @Transactional
    public void saveSlotProducts(String slotKey, List<Long> productIds) {
        if (productIds != null && productIds.size() > MAX_ITEMS_PER_SLOT) {
            throw new IllegalArgumentException("카드광고에는 최대 " + MAX_ITEMS_PER_SLOT + "개까지만 등록할 수 있습니다.");
        }

        cardAdItemRepository.deleteBySlotKey(slotKey);
        if (productIds == null || productIds.isEmpty()) return;

        int order = 0;
        for (Long productId : productIds) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다. id=" + productId));
            cardAdItemRepository.save(CardAdItem.builder()
                    .slotKey(slotKey)
                    .product(product)
                    .sortOrder(order++)
                    .build());
        }
    }
}
