package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 2차(중간) 카테고리
 * - category1: 상위(최상위) 카테고리 FK
 */
@Entity
@Table(name = "category2")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category2 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_code", nullable = false, unique = true, length = 30)
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    /** 상위(1차) 카테고리 */
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
