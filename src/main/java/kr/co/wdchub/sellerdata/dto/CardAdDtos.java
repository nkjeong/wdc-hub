package kr.co.wdchub.sellerdata.dto;

import java.util.List;

public class CardAdDtos {

    /** 관리자가 카드광고 슬롯에 넣을 상품 id 목록을 저장할 때 씁니다. 순서가 곧 슬라이드 순서입니다. */
    public record CardAdSaveRequest(List<Long> productIds) {}
}
