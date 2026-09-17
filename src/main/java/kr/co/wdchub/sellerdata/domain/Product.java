package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 상품 엔티티
 *
 * 카테고리는 1~3차 FK를 모두 저장합니다 (Category3가 category1도 함께 저장하는 것과 같은 이유 —
 * "1차가 뭔지"로 바로 필터링하려고 JOIN을 여러 단계 타지 않기 위한 비정규화).
 *
 * 가격 용어 정리:
 *  - consumerPrice   : 제조사 소비자가(MSRP)
 *  - recommendedPrice: 오픈마켓 권장 판매가 (셀러가 오픈마켓에 올릴 때 권장하는 가격)
 *  - sellerPrice1~3  : 셀러 등급별 공급가 (플랫폼이 셀러에게 공급하는 가격, 등급마다 다름)
 */
@Entity
@Table(name = "product")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "barcode", length = 50)
    private String barcode;

    /** 품번 (모델명 겸용) */
    @Column(name = "product_number", length = 100)
    private String productNumber;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    /** 규격 */
    @Column(name = "spec", length = 100)
    private String spec;

    /** 제조사 소비자가(MSRP) */
    @Column(name = "consumer_price", precision = 12, scale = 2)
    private BigDecimal consumerPrice;

    /** 오픈마켓 권장 판매가 */
    @Column(name = "recommended_price", precision = 12, scale = 2)
    private BigDecimal recommendedPrice;

    @Column(name = "unit", length = 20)
    private String unit;

    @Column(name = "unit_quantity")
    private Integer unitQuantity;

    /** 입수량 / 박스당수량 */
    @Column(name = "pack_quantity")
    private Integer packQuantity;

    // ── 카테고리 (1~3차 모두 저장 — 조회 편의를 위한 비정규화) ──

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category1_id")
    private Category1 category1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category2_id")
    private Category2 category2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category3_id")
    private Category3 category3;

    // ── 브랜드 ──

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    /** 상품 자체의 원산지 (브랜드의 원산지와 다를 수 있어 별도로 둠) */
    @Column(name = "country_of_origin", length = 50)
    private String countryOfOrigin;

    // ── 판매가 (셀러 등급별 공급가) ──

    @Column(name = "seller_price1", precision = 12, scale = 2)
    private BigDecimal sellerPrice1;

    @Column(name = "seller_price2", precision = 12, scale = 2)
    private BigDecimal sellerPrice2;

    @Column(name = "seller_price3", precision = 12, scale = 2)
    private BigDecimal sellerPrice3;

    /** 검색용 키워드 (쉼표로 구분해서 저장) */
    @Column(name = "keyword", length = 300)
    private String keyword;

    /** 대표이미지 — 리스트용 작은 썸네일 */
    @Column(name = "main_image_thumb_url", length = 255)
    private String mainImageThumbUrl;

    /** 대표이미지 — 상품 상세 Offcanvas 표시용 (500x500 이내) */
    @Column(name = "main_image_detail_url", length = 255)
    private String mainImageDetailUrl;

    /** 대표이미지 — 상품 클릭 시 보여줄 중간 크기 (다른 화면에서 필요할 수 있어 유지) */
    @Column(name = "main_image_medium_url", length = 255)
    private String mainImageMediumUrl;

    /** 대표이미지 — 다운로드용 원본 */
    @Column(name = "main_image_original_url", length = 255)
    private String mainImageOriginalUrl;

    /** 상세이미지 여러 장 — 원본 그대로 저장 (다운로드/엑셀용), 줄바꿈으로 구분해서 경로 저장 */
    @Lob
    @Column(name = "detail_image_urls")
    private String detailImageUrls;

    /** 상세이미지 표시용(가로 520px로 리사이즈) — 원본과 같은 순서, 줄바꿈으로 구분. 회원용 Offcanvas 표시에 사용 */
    @Lob
    @Column(name = "detail_image_view_urls")
    private String detailImageViewUrls;

    /** 상세설명 */
    @Lob
    @Column(name = "description")
    private String description;

    // ── 상태 플래그 ──

    @Column(name = "stock_out_yn", nullable = false)
    @Builder.Default
    private Boolean stockOutYn = false;

    /** 옵션(색상/사이즈 등) 존재 여부 — true면 ProductOption 테이블에 하위 옵션이 등록됨 */
    @Column(name = "has_option_yn", nullable = false)
    @Builder.Default
    private Boolean hasOptionYn = false;

    @Column(name = "discontinued_yn", nullable = false)
    @Builder.Default
    private Boolean discontinuedYn = false;

    @Column(name = "bundle_yn", nullable = false)
    @Builder.Default
    private Boolean bundleYn = false;

    @Column(name = "imported_yn", nullable = false)
    @Builder.Default
    private Boolean importedYn = false;

    /** 신규등록 — 시스템에 새로 등록된 상품인지 */
    @Column(name = "new_registered_yn", nullable = false)
    @Builder.Default
    private Boolean newRegisteredYn = false;

    /** 신상품 — 제조사/수입사 기준으로 새로 나온 상품인지 (신규등록과는 다른 의미) */
    @Column(name = "new_product_yn", nullable = false)
    @Builder.Default
    private Boolean newProductYn = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
