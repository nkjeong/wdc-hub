package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * 주문 한 줄(상품 하나, 옵션 하나). 상품명·바코드·단가는 주문 당시 값을 스냅샷으로 저장합니다.
 * (나중에 상품 정보가 바뀌거나 상품이 삭제되어도 지난 주문 내역은 그대로 보여야 하므로)
 */
@Entity
@Table(name = "order_item", indexes = @Index(name = "idx_order_item_order", columnList = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /** Product.id (상품이 나중에 삭제될 수 있어 FK는 걸지 않음) */
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "barcode", length = 50)
    private String barcode;

    /** 옵션이 있는 상품이면 "색상: 블랙" 형태로 저장, 없으면 null */
    @Column(name = "option_name", length = 200)
    private String optionName;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lineTotal;
}
