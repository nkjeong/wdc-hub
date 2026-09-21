package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 회원이 오픈마켓에서 쓰는 판매자 아이디. (선택 입력)
 * 한 사이트에 아이디가 여러 개일 수 있어서, 회원 1명이 (사이트, 아이디) 행을 여러 개 가질 수 있습니다.
 * 예) G마켓 A아이디, G마켓 B아이디, 쿠팡 C아이디
 * G마켓 등록 양식의 'G 판매자ID' 칸을 채울 때 씁니다.
 */
@Entity
@Table(name = "member_market_account",
        uniqueConstraints = @UniqueConstraint(name = "uk_member_market_account", columnNames = {"member_id", "site", "account_id"}),
        indexes = @Index(name = "idx_member_market_member", columnList = "member_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberMarketAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Member.id (FK 제약은 걸지 않고 값만 저장) */
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "site", nullable = false, length = 20)
    private MarketSite site;

    /** 사이트의 판매자 아이디 */
    @Column(name = "account_id", nullable = false, length = 100)
    private String accountId;

    /** 입력한 순서 (화면에 보여줄 순서) */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
