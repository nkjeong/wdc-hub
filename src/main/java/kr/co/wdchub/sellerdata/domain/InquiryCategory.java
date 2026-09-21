package kr.co.wdchub.sellerdata.domain;

/** 1:1 문의 분류 */
public enum InquiryCategory {
    PRODUCT("상품"),
    MEMBER("회원·등급"),
    SITE("사이트 이용"),
    ETC("기타");

    private final String label;

    InquiryCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
