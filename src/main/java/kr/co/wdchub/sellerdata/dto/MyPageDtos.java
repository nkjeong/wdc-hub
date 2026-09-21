package kr.co.wdchub.sellerdata.dto;

import java.time.LocalDateTime;

public class MyPageDtos {

    /** 기본정보 수정 요청 */
    public record BasicRequest(String name, String email, String phoneNumber) {}

    /** 비밀번호 변경 요청 */
    public record PasswordRequest(String currentPassword, String newPassword, String newPasswordConfirm) {}

    /** 사업자 정보 수정 요청 (사업자등록번호와 사업자등록증은 여기서 바꿀 수 없습니다) */
    public record BusinessRequest(String companyName, String ceoName, String businessType, String businessCategory,
                                  String zonecode, String companyAddress, String addressDetail,
                                  String companyPhone, String companyFax) {}

    /** 마이페이지 화면에 보여줄 내 정보 */
    public record ProfileDto(
            String loginId,
            String name,
            String email,
            String phoneNumber,
            String companyName,
            String ceoName,
            String businessRegistrationNumber,
            String businessType,
            String businessCategory,
            String zonecode,
            String companyAddress,
            String addressDetail,
            String companyPhone,
            String companyFax,
            String grade,          // NORMAL / GOLD / VIP
            String statusLabel,    // 승인 대기 / 승인 완료 / 승인 거절
            String memberCode,
            LocalDateTime approvedAt
    ) {}
}
