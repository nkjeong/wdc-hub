package kr.co.wdchub.sellerdata.dto;

import kr.co.wdchub.sellerdata.domain.MarketSite;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 회원가입 폼에서 넘어오는 "오픈마켓 아이디" 한 줄.
 * 폼 필드 이름은 marketAccounts[0].site, marketAccounts[0].accountId 처럼 번호가 붙습니다.
 * (record가 아니라 일반 클래스인 이유: 스프링이 번호가 늘어나는 목록을 채울 때 기본 생성자가 필요해서입니다.)
 */
@Getter
@Setter
@NoArgsConstructor
public class MarketAccountInput {

    /** 사이트 (드롭다운에서 선택) */
    private MarketSite site;

    /** 판매자 아이디 */
    private String accountId;
}
