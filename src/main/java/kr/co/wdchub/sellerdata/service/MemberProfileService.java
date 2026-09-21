package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.Member;
import kr.co.wdchub.sellerdata.domain.MemberStatus;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.BasicRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.BusinessRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.PasswordRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.ProfileDto;
import kr.co.wdchub.sellerdata.repository.MemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * 마이페이지(회원정보) — 기본정보, 비밀번호, 사업자 정보 수정.
 *
 * 로그인 상태(세션)에 들어 있는 회원 정보(principal)는 로그인할 때의 복사본이라서,
 * DB만 고치면 상단바의 회사명 같은 값이 다시 로그인하기 전까지 예전 값으로 보입니다.
 * 그래서 DB에 저장하면서 세션 안의 회원 객체(principalMember)에도 같은 값을 반영합니다.
 */
@Service
public class MemberProfileService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    /** 회원가입 안내 문구와 같은 규칙: 영문 + 숫자 + 특수문자 조합 8자 이상 */
    private static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,64}$");

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public MemberProfileService(MemberRepository memberRepository, PasswordEncoder passwordEncoder,
                                NotificationService notificationService) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    // ── 조회 ─────────────────────────────────

    @Transactional(readOnly = true)
    public ProfileDto getProfile(Long memberId) {
        return toProfile(find(memberId));
    }

    // ── 기본정보 ─────────────────────────────

    @Transactional
    public ProfileDto updateBasic(Long memberId, BasicRequest req, Member principalMember) {
        String name = trim(req.name());
        String email = trim(req.email());
        if (name.isEmpty()) throw new IllegalArgumentException("담당자 이름을 입력해 주세요.");
        if (name.length() > 50) throw new IllegalArgumentException("담당자 이름은 50자 이내로 입력해 주세요.");
        if (email.isEmpty()) throw new IllegalArgumentException("이메일을 입력해 주세요.");
        if (email.length() > 100 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("이메일 형식을 확인해 주세요. (예: example@company.co.kr)");
        }
        String phone = formatPhone(req.phoneNumber());
        if (phone == null || !phone.matches("^01[016789]-\\d{3,4}-\\d{4}$")) {
            throw new IllegalArgumentException("휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
        }

        Member m = find(memberId);
        // 이메일을 바꾼 경우에만 다른 회원과 겹치는지 확인합니다.
        if (m.getEmail() == null || !m.getEmail().equalsIgnoreCase(email)) {
            if (memberRepository.existsByEmail(email)) {
                throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
            }
        }

        apply(m, name, email, phone);
        if (principalMember != null) apply(principalMember, name, email, phone);
        return toProfile(m);
    }

    private void apply(Member m, String name, String email, String phone) {
        m.setName(name);
        m.setEmail(email);
        m.setPhoneNumber(phone);
    }

    // ── 비밀번호 ─────────────────────────────

    @Transactional
    public void changePassword(Long memberId, PasswordRequest req, Member principalMember) {
        String current = req.currentPassword() == null ? "" : req.currentPassword();
        String next = req.newPassword() == null ? "" : req.newPassword();
        String confirm = req.newPasswordConfirm() == null ? "" : req.newPasswordConfirm();

        Member m = find(memberId);
        if (current.isEmpty() || !passwordEncoder.matches(current, m.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 맞지 않아요.");
        }
        if (!PASSWORD.matcher(next).matches()) {
            throw new IllegalArgumentException("새 비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8자 이상으로 입력해 주세요.");
        }
        if (!next.equals(confirm)) {
            throw new IllegalArgumentException("새 비밀번호와 확인 값이 일치하지 않아요.");
        }
        if (passwordEncoder.matches(next, m.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
        }

        String encoded = passwordEncoder.encode(next);
        m.setPassword(encoded);
        if (principalMember != null) principalMember.setPassword(encoded);
    }

    // ── 사업자 정보 ──────────────────────────

    @Transactional
    public ProfileDto updateBusiness(Long memberId, BusinessRequest req, Member principalMember) {
        String companyName = trim(req.companyName());
        String ceoName = trim(req.ceoName());
        if (companyName.isEmpty()) throw new IllegalArgumentException("상호명을 입력해 주세요.");
        if (ceoName.isEmpty()) throw new IllegalArgumentException("대표자명을 입력해 주세요.");
        if (companyName.length() > 100) throw new IllegalArgumentException("상호명은 100자 이내로 입력해 주세요.");
        if (ceoName.length() > 50) throw new IllegalArgumentException("대표자명은 50자 이내로 입력해 주세요.");

        String businessType = limit(trim(req.businessType()), 50, "업태");
        String businessCategory = limit(trim(req.businessCategory()), 50, "종목");
        String zonecode = limit(trim(req.zonecode()), 10, "우편번호");
        String address = limit(trim(req.companyAddress()), 200, "주소");
        String detail = limit(trim(req.addressDetail()), 100, "상세주소");
        String companyPhone = optionalPhone(req.companyPhone(), "회사 대표번호");
        String companyFax = optionalPhone(req.companyFax(), "팩스번호");

        Member m = find(memberId);
        String oldCompany = m.getCompanyName();
        String oldCeo = m.getCeoName();

        applyBusiness(m, companyName, ceoName, businessType, businessCategory, zonecode, address, detail, companyPhone, companyFax);
        if (principalMember != null) {
            applyBusiness(principalMember, companyName, ceoName, businessType, businessCategory, zonecode, address, detail, companyPhone, companyFax);
        }

        // 상호나 대표자가 바뀌면 가입 심사 때와 달라지는 것이라, 관리자에게 알려 줍니다.
        if (!Objects.equals(oldCompany, companyName) || !Objects.equals(oldCeo, ceoName)) {
            String body = "회원: " + m.getLoginId() + "\n"
                    + "상호: " + nz(oldCompany) + " → " + companyName + "\n"
                    + "대표자: " + nz(oldCeo) + " → " + ceoName;
            notificationService.notifyAdmins("MEMBER_BUSINESS_CHANGED", "회원 사업자 정보 변경",
                    m.getLoginId() + " · " + companyName, "/admin/members", body);
        }
        return toProfile(m);
    }

    private void applyBusiness(Member m, String companyName, String ceoName, String businessType, String businessCategory,
                               String zonecode, String address, String detail, String companyPhone, String companyFax) {
        m.setCompanyName(companyName);
        m.setCeoName(ceoName);
        m.setBusinessType(businessType);
        m.setBusinessCategory(businessCategory);
        m.setZonecode(zonecode);
        m.setCompanyAddress(address);
        m.setAddressDetail(detail);
        m.setCompanyPhone(companyPhone);
        m.setCompanyFax(companyFax);
    }

    // ── 내부 ─────────────────────────────────

    private Member find(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없어요."));
    }

    private ProfileDto toProfile(Member m) {
        return new ProfileDto(
                m.getLoginId(), m.getName(), m.getEmail(), m.getPhoneNumber(),
                m.getCompanyName(), m.getCeoName(), m.getBusinessRegistrationNumber(),
                m.getBusinessType(), m.getBusinessCategory(),
                m.getZonecode(), m.getCompanyAddress(), m.getAddressDetail(),
                m.getCompanyPhone(), m.getCompanyFax(),
                m.getGrade() == null ? "NORMAL" : m.getGrade().name(),
                statusLabel(m.getStatus()), m.getMemberCode(), m.getApprovedAt());
    }

    private String statusLabel(MemberStatus status) {
        if (status == null) return "-";
        return switch (status) {
            case PENDING -> "승인 대기";
            case APPROVED -> "승인 완료";
            case REJECTED -> "승인 거절";
            default -> status.name();
        };
    }

    private String optionalPhone(String raw, String label) {
        String t = trim(raw);
        if (t.isEmpty()) return null;
        String f = formatPhone(t);
        if (f == null) throw new IllegalArgumentException(label + " 형식을 확인해 주세요. (숫자만 입력해도 돼요)");
        return f;
    }

    /** 숫자만 뽑아서 하이픈을 붙입니다. 형식을 알 수 없으면 null. (휴대폰, 서울 02, 지역번호, 1588 같은 대표번호) */
    static String formatPhone(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("[^0-9]", "");
        if (d.startsWith("02")) {
            if (d.length() == 9) return d.substring(0, 2) + "-" + d.substring(2, 5) + "-" + d.substring(5);
            if (d.length() == 10) return d.substring(0, 2) + "-" + d.substring(2, 6) + "-" + d.substring(6);
            return null;
        }
        if (d.length() == 11) return d.substring(0, 3) + "-" + d.substring(3, 7) + "-" + d.substring(7);
        if (d.length() == 10) return d.substring(0, 3) + "-" + d.substring(3, 6) + "-" + d.substring(6);
        if (d.length() == 8) return d.substring(0, 4) + "-" + d.substring(4);   // 1588-1234
        return null;
    }

    private String limit(String s, int max, String label) {
        if (s.length() > max) throw new IllegalArgumentException(label + "은(는) " + max + "자 이내로 입력해 주세요.");
        return s.isEmpty() ? null : s;
    }

    private String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private String nz(String s) {
        return s == null ? "-" : s;
    }
}
