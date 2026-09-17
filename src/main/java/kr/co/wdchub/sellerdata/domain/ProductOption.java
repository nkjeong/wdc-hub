package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 상품 옵션 (색상, 사이즈 등)
 * - id: 내부 PK (auto-increment)
 * - optionCode: 화면/외부 노출용 비즈니스 키 (예: OPT-000001)
 * - product: 이 옵션이 속한 상품 (FK)
 *
 * 하나의 상품에 "색상=빨강", "색상=파랑", "사이즈=L" 처럼 여러 행이 매달리는 평면(flat) 구조입니다.
 * 만약 "색상+사이즈" 조합(빨강-L, 빨강-M ...)별로 재고/가격을 따로 관리해야 하는 수준까지 필요해지면,
 * 그때는 옵션 조합 테이블을 별도로 분리하는 걸 고려해볼 수 있습니다.
 */
@Entity
@Table(name = "product_option")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "option_code", nullable = false, unique = true, length = 30)
    private String optionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** 옵션명 (예: 색상, 사이즈) */
    @Column(name = "option_name", nullable = false, length = 50)
    private String optionName;

    /** 옵션값 (예: 빨강, L) */
    @Column(name = "option_value", nullable = false, length = 100)
    private String optionValue;

    /** 이 옵션 선택 시 추가되는 금액 (없으면 0) */
    @Column(name = "additional_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal additionalPrice = BigDecimal.ZERO;

    /** 옵션별 재고수량 */
    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    /** 옵션별 바코드(SKU) — 색상/사이즈마다 실제 바코드가 따로 있는 경우 */
    @Column(name = "option_barcode", length = 50)
    private String optionBarcode;

    /** 옵션별 품절여부 — 상품 전체는 판매중이어도 특정 옵션만 품절될 수 있음 */
    @Column(name = "sold_out_yn", nullable = false)
    @Builder.Default
    private Boolean soldOutYn = false;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "use_yn", nullable = false)
    @Builder.Default
    private Boolean useYn = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
