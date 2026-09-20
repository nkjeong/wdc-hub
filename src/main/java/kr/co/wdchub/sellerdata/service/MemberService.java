package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberGrade;
import kr.co.wdchub.sellerdata.domain.MemberRole;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
import kr.co.wdchub.sellerdata.dto.SignupForm;
import kr.co.wdchub.sellerdata.repository.MemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final NotificationService notificationService;

    public MemberService(MemberRepository memberRepository, PasswordEncoder passwordEncoder,
                          FileStorageService fileStorageService, NotificationService notificationService) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
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

        Member saved = memberRepository.save(member);

        // 관리자에게 벨 알림 + 시놀로지 Chat 알림 (연락처/이메일 같은 개인정보는 Chat에 보내지 않습니다)
        notificationService.notifyAdmins(
                "MEMBER_SIGNUP_NEW",
                "새 회원가입 신청",
                saved.getCompanyName() + " · " + saved.getLoginId(),
                "/admin/members",
                "회사명: " + saved.getCompanyName() + "\n"
                        + "대표자: " + saved.getCeoName() + "\n"
                        + "아이디: " + saved.getLoginId());

        return saved;
    }

    // ---- 관리자 회원관리 ----

    public List<Member> getAllMembersOrderByCreatedAtDesc() {
        return memberRepository.findAllByOrderByCreatedAtDesc();
    }

    /** 관리자 회원관리 화면 페이지네이션용 — page는 0부터 시작합니다 */
    public Page<Member> getMembersPage(int page, int size) {
        return memberRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
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
