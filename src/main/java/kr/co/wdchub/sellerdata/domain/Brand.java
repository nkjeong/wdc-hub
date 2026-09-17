package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 브랜드(제조사/수입사) 엔티티
 * - id: 내부 PK (auto-increment)
 * - brandCode: 화면/외부 노출용 비즈니스 키 (예: BRD-001)
 *
 * 참고: 제조사명/수입사명을 브랜드 하나에 함께 저장하는 구조입니다.
 * 한 수입사가 여러 브랜드를 취급해서 수입사 정보가 브랜드마다 중복 저장되는 게 문제될 정도로
 * 브랜드 수가 많아지면, 그때는 Importer(수입사) 테이블을 분리하는 걸 고려해볼 수 있습니다.
 */
@Entity
@Table(name = "brand")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_code", nullable = false, unique = true, length = 20)
    private String brandCode;

    /** 브랜드명(국문) */
    @Column(name = "brand_name_kr", nullable = false, length = 100)
    private String brandNameKr;

    /** 브랜드명(영문) — 선택 */
    @Column(name = "brand_name_en", length = 100)
    private String brandNameEn;

    @Column(name = "manufacturer_name", nullable = false, length = 150)
    private String manufacturerName;

    /** 수입사명 — 국내 브랜드 등 수입사가 없는 경우 비워둘 수 있음 */
    @Column(name = "importer_name", length = 150)
    private String importerName;

    /** 취급상품 요약 소개 */
    @Column(name = "product_summary", length = 500)
    private String productSummary;

    /** 로고 이미지 파일 경로 (FileStorageService로 저장 후 웹 접근 경로 저장) */
    @Column(name = "logo_image_url", length = 255)
    private String logoImageUrl;

    /** 원산지 / 제조국 */
    @Column(name = "country_of_origin", length = 50)
    private String countryOfOrigin;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_type", length = 20)
    private ImportType importType;

    /** 주로 취급하는 1차 카테고리 (선택) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category1_id")
    private Category1 category1;

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
