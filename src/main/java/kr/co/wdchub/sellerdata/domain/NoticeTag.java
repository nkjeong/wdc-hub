package kr.co.wdchub.sellerdata.domain;

/** 공지사항 배지 종류. 표시 라벨과 CSS 클래스명(코드 그대로 소문자)이 대시보드 위젯에서 함께 쓰입니다. */
public enum NoticeTag {
    UPDATE("업데이트"),
    MAINT("점검"),
    NOTICE("안내"),
    NEW("신규"),
    PRICE("소비자가"),
    PRICE_UP("단가인상");

    private final String label;

    NoticeTag(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
