package kr.co.wdchub.sellerdata.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class OrderDtos {

    // ── 상품 검색 (주문하기 화면에서 상품을 담을 때 씁니다) ──

    public record ProductSearchResult(
            Long id, String productName, String barcode, String mainImageThumbUrl,
            String unit, Integer unitQuantity, BigDecimal unitPrice, Boolean hasOptionYn
    ) {}

    public record OptionResult(
            Long id, String optionName, String optionValue,
            BigDecimal additionalPrice, Integer stockQuantity, Boolean soldOutYn
    ) {}

    // ── 주문 접수 ──

    public record OrderItemRequest(Long productId, Long optionId, Integer quantity) {}

    public record OrderCreateRequest(
            String requesterName,
            String requesterPhone,
            String zonecode,
            String address,
            String addressDetail,
            String deliveryMessage,
            List<OrderItemRequest> items
    ) {}

    // ── 조회 ──

    public record OrderItemDto(
            Long id, Long productId, String productName, String barcode, String optionName,
            BigDecimal unitPrice, Integer quantity, BigDecimal lineTotal
    ) {}

    public record OrderDto(
            Long id,
            String orderCode,
            String status,
            String statusLabel,
            String requesterName,
            String requesterPhone,
            String zonecode,
            String address,
            String addressDetail,
            String deliveryMessage,
            String carrier,
            String trackingNumber,
            String adminMemo,
            String requesterUsername,   // 관리자 조회에서만 채움
            String companyName,        // 관리자 조회에서만 채움
            BigDecimal totalAmount,
            LocalDateTime createdAt,
            LocalDateTime confirmedAt,
            LocalDateTime shippedAt,
            List<OrderItemDto> items
    ) {}

    // ── 관리자: 상태 변경 ──

    public record StatusUpdateRequest(String status, String carrier, String trackingNumber, String adminMemo) {}

    // ── 관리자: "주문접수" 탭 엑셀 다운로드 → 자동 주문확인 처리 ──

    public record ExportRequest(java.util.List<Long> orderIds, Boolean force) {}

    /** 이미 한 번 다운로드했던 주문이 포함되어 있을 때 409로 돌려주는 응답 (프론트가 확인창을 띄우는 데 씁니다) */
    public record ExportConflict(java.util.List<String> alreadyDownloadedOrderCodes) {}

    public record ExportLogDto(Long id, LocalDateTime exportedAt, String adminUsername, int orderCount, String orderCodes) {}
}
