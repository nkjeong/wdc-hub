package kr.co.wdchub.sellerdata.controller;

import jakarta.validation.Valid;
import kr.co.wdchub.sellerdata.domain.MarketSite;
import kr.co.wdchub.sellerdata.dto.MarketAccountInput;
import kr.co.wdchub.sellerdata.dto.SignupForm;
import kr.co.wdchub.sellerdata.service.MarketAccountService;
import kr.co.wdchub.sellerdata.service.MemberService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class SignupController {

    private final MemberService memberService;
    private final MarketAccountService marketAccountService;

    public SignupController(MemberService memberService, MarketAccountService marketAccountService) {
        this.memberService = memberService;
        this.marketAccountService = marketAccountService;
    }

    /** 가입 화면의 "오픈마켓 아이디" 사이트 드롭다운에 쓰는 목록 */
    @ModelAttribute("marketSites")
    public MarketSite[] marketSites() {
        return MarketSite.values();
    }

    @GetMapping("/signup")
    public String signupForm(Model model) {
        SignupForm form = new SignupForm();
        form.getMarketAccounts().add(new MarketAccountInput()); // 오픈마켓 아이디 입력줄 1개는 기본으로 보여줍니다
        model.addAttribute("signupForm", form);
        return "signup";
    }

    @PostMapping("/signup")
    public String signup(@Valid @ModelAttribute("signupForm") SignupForm form,
                          BindingResult bindingResult) {

        // 비밀번호 확인 일치 여부 (Bean Validation으로는 필드 간 비교가 어려워 직접 체크)
        if (form.getPassword() != null && !form.getPassword().equals(form.getPasswordConfirm())) {
            bindingResult.rejectValue("passwordConfirm", "mismatch", "비밀번호가 일치하지 않습니다.");
        }

        // 약관 동의 여부
        if (!form.isAgreeTerms()) {
            bindingResult.reject("terms", "이용약관 및 개인정보처리방침에 동의해주세요.");
        }

        // 사업자등록증 첨부 필수 (JS 검증을 우회해서 요청을 보내는 경우까지 막기 위한 서버단 방어)
        if (form.getBusinessLicenseFile() == null || form.getBusinessLicenseFile().isEmpty()) {
            bindingResult.rejectValue("businessLicenseFile", "required", "사업자등록증 파일을 첨부해주세요.");
        }

        // 중복 체크는 DB 조회가 필요해서 어노테이션이 아니라 서비스에서 직접 확인합니다.
        if (form.getLoginId() != null && memberService.isLoginIdDuplicate(form.getLoginId())) {
            bindingResult.rejectValue("loginId", "duplicate", "이미 사용 중인 아이디입니다.");
        }
        if (form.getEmail() != null && memberService.isEmailDuplicate(form.getEmail())) {
            bindingResult.rejectValue("email", "duplicate", "이미 사용 중인 이메일입니다.");
        }
        if (form.getBusinessRegistrationNumber() != null
                && memberService.isBusinessRegistrationNumberDuplicate(form.getBusinessRegistrationNumber())) {
            bindingResult.rejectValue("businessRegistrationNumber", "duplicate", "이미 등록된 사업자등록번호입니다.");
        }

        // 오픈마켓 아이디(선택): 적은 줄이 있으면 형식을 검사합니다. 전부 비어 있으면 그냥 통과.
        try {
            marketAccountService.validate(form.getMarketAccounts());
        } catch (IllegalArgumentException e) {
            bindingResult.rejectValue("marketAccounts", "invalid", e.getMessage());
        }

        if (bindingResult.hasErrors()) {
            ensureOneMarketRow(form);
            return "signup";
        }

        try {
            memberService.signup(form);
        } catch (IllegalArgumentException e) {
            // 파일 형식/크기 검증 실패 (FileStorageService에서 던짐)
            bindingResult.rejectValue("businessLicenseFile", "invalid", e.getMessage());
            ensureOneMarketRow(form);
            return "signup";
        } catch (IllegalStateException e) {
            // 파일 저장 중 서버 오류
            bindingResult.reject("fileError", e.getMessage());
            ensureOneMarketRow(form);
            return "signup";
        }

        return "redirect:/signup/complete";
    }

    /** 화면을 다시 그릴 때 오픈마켓 아이디 입력줄이 하나도 없으면 빈 줄 1개를 넣어 둡니다. */
    private void ensureOneMarketRow(SignupForm form) {
        if (form.getMarketAccounts() == null || form.getMarketAccounts().isEmpty()) {
            form.getMarketAccounts().add(new MarketAccountInput());
        }
    }

    @GetMapping("/signup/complete")
    public String signupComplete() {
        return "signup-complete";
    }
}
