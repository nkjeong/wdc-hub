package kr.co.wdchub.sellerdata.domain;

/**
 * 회원이 판매 중인 오픈마켓 사이트 종류.
 * 화면 드롭다운은 이 목록으로 만들고, DB에는 이름(GMARKET 등)이 저장됩니다.
 * 사이트를 추가/삭제하려면 이 목록만 고치면 됩니다.
 */
public enum MarketSite {
    GMARKET("G마켓"),
    AUCTION("옥션"),
    SMARTSTORE("스마트스토어"),
    COUPANG("쿠팡"),
    ELEVENST("11번가"),
    LOTTEON("롯데온"),
    KAKAO("카카오톡스토어"),
    TOSS("토스쇼핑"),
    ETC("기타");

    private final String label;

    MarketSite(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
