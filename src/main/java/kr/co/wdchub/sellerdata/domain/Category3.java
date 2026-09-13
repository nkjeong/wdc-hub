package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 3차(최하위) 카테고리
 * - category2: 상위(중간) 카테고리 FK
 * - category1: 최상위 카테고리 FK (조회 성능을 위한 비정규화 — 2단계 JOIN 없이 바로 최상위 확인 가능)
 */
@Entity
@Table(name = "category3")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category3 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_code", nullable = false, unique = true, length = 40)
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    /** 상위(2차) 카테고리 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category2_id", nullable = false)
    private Category2 category2;

    /** 최상위(1차) 카테고리 — 비정규화 컬럼, 조회 편의용 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category1_id", nullable = false)
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
