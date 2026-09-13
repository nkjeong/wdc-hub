package kr.co.wdchub.sellerdata.domain;

public enum MemberStatus {
    PENDING,    // 승인 대기
    APPROVED,   // 승인 완료 (로그인 가능)
    REJECTED,   // 승인 거절
    SUSPENDED   // 이용 정지
}
