package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * 대시보드 "주요 브랜드" 영역에 노출할 브랜드와 순서(1~10위).
 * 브랜드 이름·로고 같은 정보는 여기 두지 않고, 항상 brand 테이블에서 최신 값을 읽어옵니다.
 */
@Entity
@Table(name = "featured_brand")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeaturedBrand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false, unique = true)
    private Long brandId;

    /** 1위가 가장 먼저 보임 */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
