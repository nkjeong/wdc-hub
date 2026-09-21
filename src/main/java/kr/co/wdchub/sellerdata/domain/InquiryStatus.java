package kr.co.wdchub.sellerdata.domain;

/** 1:1 문의 처리 상태 */
public enum InquiryStatus {
    RECEIVED("접수"),
    IN_PROGRESS("처리중"),
    ANSWERED("답변완료");

    private final String label;

    InquiryStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
