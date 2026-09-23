package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * "주문접수" 탭에서 엑셀을 내려받을 때마다 남는 기록 한 줄.
 * 그 다운로드로 주문확인 처리된 주문들이 몇 건인지, 언제, 누가 받았는지를 보여줍니다.
 */
@Entity
@Table(name = "order_export_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderExportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_username", length = 100)
    private String adminUsername;

    @Column(name = "order_count", nullable = false)
    private int orderCount;

    /** 이번에 내려받은 주문번호들 (화면에 그대로 보여주는 용도, 쉼표로 구분) */
    @Lob
    @Column(name = "order_codes")
    private String orderCodes;

    @CreationTimestamp
    @Column(name = "exported_at", updatable = false)
    private LocalDateTime exportedAt;
}
