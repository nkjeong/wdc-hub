package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 1차(최상위) 카테고리
 * - id: 내부 PK (auto-increment) — FK 연결용
 * - categoryCode: 화면/외부 노출용 비즈니스 키 (예: CTG1-001)
 */
@Entity
@Table(name = "category1")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category1 {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_code", nullable = false, unique = true, length = 20)
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    /** 사용 여부 (삭제 대신 비활성화 처리용) */
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
