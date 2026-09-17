package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberGrade;
import kr.co.wdchub.sellerdata.domain.MemberRole;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
import kr.co.wdchub.sellerdata.dto.SignupForm;
import kr.co.wdchub.sellerdata.repository.MemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    public MemberService(MemberRepository memberRepository, PasswordEncoder passwordEncoder,
                          FileStorageService fileStorageService) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
    }

    public boolean isLoginIdDuplicate(String loginId) {
        return memberRepository.existsByLoginId(loginId);
    }

    public boolean isEmailDuplicate(String email) {
        return memberRepository.existsByEmail(email);
    }

    public boolean isBusinessRegistrationNumberDuplicate(String businessRegistrationNumber) {
        return memberRepository.existsByBusinessRegistrationNumber(businessRegistrationNumber);
    }

    @Transactional
    public Member signup(SignupForm form) {
        String licenseFileUrl = fileStorageService.storeBusinessLicense(form.getBusinessLicenseFile());

        Member member = Member.builder()
                .loginId(form.getLoginId())
                .password(passwordEncoder.encode(form.getPassword())) // 암호화해서 저장
                .name(form.getName())
                .email(form.getEmail())
                .phoneNumber(form.getPhoneNumber())
                .role(MemberRole.SELLER)
                .status(MemberStatus.PENDING) // 가입 신청 직후엔 승인 대기
                .companyName(form.getCompanyName())
                .ceoName(form.getCeoName())
                .businessRegistrationNumber(form.getBusinessRegistrationNumber())
                .businessType(form.getBusinessType())
                .businessCategory(form.getBusinessCategory())
                .zonecode(form.getZonecode())
                .companyAddress(form.getCompanyAddress())
                .addressDetail(form.getAddressDetail())
                .companyPhone(form.getCompanyPhone())
                .companyFax(form.getCompanyFax())
                .businessLicenseFileUrl(licenseFileUrl)
                .termsAgreedAt(form.isAgreeTerms() ? LocalDateTime.now() : null)
                .build();

        return memberRepository.save(member);
    }

    // ---- 관리자 회원관리 ----

    public List<Member> getAllMembersOrderByCreatedAtDesc() {
        return memberRepository.findAllByOrderByCreatedAtDesc();
    }

    public long getPendingCount() {
        return memberRepository.countByStatus(MemberStatus.PENDING);
    }

    @Transactional
    public void approve(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다: " + id));

        member.setStatus(MemberStatus.APPROVED);
        member.setApprovedAt(LocalDateTime.now());
        // 승인 시점에 대외 노출용 코드를 발급합니다. 예: SLR-2026-000123
        member.setMemberCode("SLR-" + Year.now().getValue() + "-" + String.format("%06d", member.getId()));
    }

    @Transactional
    public void reject(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다: " + id));

        member.setStatus(MemberStatus.REJECTED);
    }

    @Transactional
    public void updateGrade(Long id, MemberGrade grade) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다: " + id));

        member.setGrade(grade);
    }
}
