package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * 대시보드 카드광고에 노출할 상품을 슬롯별로 저장합니다.
 * slotKey는 광고 영역을 구분하는 키입니다 (예: "card-ad-1"). 나중에 광고 영역이 늘어나도
 * slotKey만 다르게 써서 같은 구조를 재사용할 수 있습니다.
 * 한 슬롯에 몇 개까지 넣을지는 서비스 레이어에서 제한합니다(지금은 최대 5개).
 */
@Entity
@Table(name = "card_ad_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardAdItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_key", nullable = false, length = 50)
    private String slotKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** 슬라이드에 노출되는 순서 (0부터) */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
