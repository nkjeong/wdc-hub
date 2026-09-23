package kr.co.wdchub.sellerdata.domain;

/** 물류 대행 주문의 처리 단계. 관리자가 주문확인 → 상품준비중 → 발송완료 순서로 올립니다. */
public enum OrderStatus {
    RECEIVED("주문접수"),
    CONFIRMED("주문확인"),
    PREPARING("상품준비중"),
    SHIPPED("발송완료"),
    CANCELED("주문취소");

    private final String label;

    OrderStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
