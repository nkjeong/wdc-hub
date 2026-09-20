package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 회원이 보내는 상품 관련 요청. 지금은 "상품정보 수정 요청"(MODIFY)만 쓰고,
 * 나중에 "상품등록 요청" 같은 종류가 생기면 requestType 값만 늘려서 같은 테이블/관리 화면을 씁니다.
 */
@Entity
@Table(name = "product_request", indexes = {
        @Index(name = "idx_pr_requester", columnList = "requester_username"),
        @Index(name = "idx_pr_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** MODIFY = 상품정보 수정 요청 */
    @Column(name = "request_type", nullable = false, length = 20)
    private String requestType;

    /** 요청 당시의 상품 id (상품이 나중에 삭제돼도 요청 기록은 남도록 FK는 걸지 않음) */
    @Column(name = "product_id")
    private Long productId;

    /** 요청 당시의 상품명/바코드 (기록용 스냅샷) */
    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "product_barcode", length = 50)
    private String productBarcode;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, length = 20)
    private ProductRequestField fieldType;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProductRequestStatus status;

    /** 관리자가 남기는 처리 메모/답변 (요청한 회원도 볼 수 있음) */
    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "requester_username", nullable = false, length = 100)
    private String requesterUsername;

    @Column(name = "requester_company", length = 200)
    private String requesterCompany;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
