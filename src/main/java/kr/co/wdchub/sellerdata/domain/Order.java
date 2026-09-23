package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 물류 대행 주문서. 테이블 이름은 order가 아니라 purchase_order를 씁니다 (order는 MySQL 예약어).
 * 상품 여러 개를 한 번에 담아 하나의 주문으로 접수합니다. 실제 줄 단위 내용은 OrderItem에 있습니다.
 */
@Entity
@Table(name = "purchase_order")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 화면에 보여줄 주문번호 (예: ORD-20260921-0001) */
    @Column(name = "order_code", nullable = false, unique = true, length = 30)
    private String orderCode;

    /** Member.id (FK 제약은 걸지 않고 값만 저장) */
    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /** 주문 당시의 받는 분 정보 (회원 정보가 나중에 바뀌어도 주문 기록은 그대로 남도록 스냅샷으로 저장) */
    @Column(name = "requester_name", nullable = false, length = 50)
    private String requesterName;

    @Column(name = "requester_phone", nullable = false, length = 30)
    private String requesterPhone;

    @Column(name = "zonecode", length = 10)
    private String zonecode;

    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "address_detail", length = 100)
    private String addressDetail;

    @Column(name = "delivery_message", length = 200)
    private String deliveryMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrderStatus status;

    @Column(name = "carrier", length = 50)
    private String carrier;

    @Column(name = "tracking_number", length = 50)
    private String trackingNumber;

    /** 관리자만 보는 내부 메모 */
    @Column(name = "admin_memo", length = 500)
    private String adminMemo;

    @Column(name = "total_amount", precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    /** 엑셀로 내려받은 시각. "주문접수" 탭에서 다운로드하면 채워지고, 상태를 나중에 되돌려도 이 값은 남아 있어서
     *  "이미 다운로드했던 주문"인지 구분하는 데 씁니다. */
    @Column(name = "downloaded_at")
    private LocalDateTime downloadedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
