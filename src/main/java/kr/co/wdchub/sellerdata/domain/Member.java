package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_member_login_id", columnNames = "loginId"),
        @UniqueConstraint(name = "uk_member_email", columnNames = "email"),
        @UniqueConstraint(name = "uk_member_code", columnNames = "memberCode"),
        @UniqueConstraint(name = "uk_member_business_reg_no", columnNames = "businessRegistrationNumber")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 승인 시점에 자동 생성되는 대외 노출용 코드 (예: SLR-2026-000123)
    // 승인 전에는 비어있을 수 있어 nullable = true
    @Column(length = 30)
    private String memberCode;

    // ---- 기본 회원 정보 ----
    @Column(nullable = false, length = 50)
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(nullable = false, length = 20)
    private String phoneNumber;

    @Column(nullable = false)
    @Builder.Default
    private boolean phoneVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberRole role = MemberRole.SELLER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberStatus status = MemberStatus.PENDING;

    // ---- 회사(사업자) 정보 ----
    @Column(nullable = false, length = 100)
    private String companyName;

    @Column(nullable = false, length = 20)
    private String businessRegistrationNumber;

    @Column(nullable = false, length = 50)
    private String ceoName;

    @Column(length = 50)
    private String businessType;

    @Column(length = 50)
    private String businessCategory;

    @Column(length = 200)
    private String companyAddress;

    @Column(length = 10)
    private String zonecode;

    @Column(length = 200)
    private String addressDetail;

    @Column(length = 20)
    private String companyPhone;

    @Column(length = 20)
    private String companyFax;

    @Column(length = 300)
    private String businessLicenseFileUrl;

    // ---- 시각 기록 ----
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime approvedAt;

    private LocalDateTime lastLoginAt;

    // 이용약관/개인정보처리방침 동의 시각 (약관이 나중에 개정되면 재동의 여부 판단 근거로도 쓸 수 있어요)
    private LocalDateTime termsAgreedAt;
}
