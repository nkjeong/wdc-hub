package kr.co.wdchub.sellerdata.domain;

/** 수정 요청에서 "무엇을 고치고 싶은지" 항목 */
public enum ProductRequestField {
    PRICE("가격"),
    NAME("상품명"),
    IMAGE("이미지"),
    OPTION("옵션"),
    STOCK("재고·품절"),
    ETC("기타");

    private final String label;

    ProductRequestField(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
