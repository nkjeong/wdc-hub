package kr.co.wdchub.sellerdata.dto;

import kr.co.wdchub.sellerdata.domain.ProductRequestField;
import kr.co.wdchub.sellerdata.domain.ProductRequestStatus;

import java.time.LocalDateTime;

public class ProductRequestDtos {

    /** 회원이 보내는 수정 요청 */
    public record CreateRequest(
            Long productId,
            String productName,
            String productBarcode,
            ProductRequestField fieldType,
            String content
    ) {}

    /** 관리자가 상태/답변을 바꿀 때 */
    public record UpdateRequest(ProductRequestStatus status, String adminNote) {}

    public record Response(
            Long id,
            String requestType,
            Long productId,
            String productName,
            String productBarcode,
            String fieldType,
            String fieldLabel,
            String content,
            String status,
            String statusLabel,
            String adminNote,
            String requesterUsername,
            String requesterCompany,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
