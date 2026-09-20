package kr.co.wdchub.sellerdata.domain;

/** 상품 요청 처리 상태 */
public enum ProductRequestStatus {
    RECEIVED("접수"),
    IN_PROGRESS("처리중"),
    DONE("완료"),
    REJECTED("반려");

    private final String label;

    ProductRequestStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
