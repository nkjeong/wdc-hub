package kr.co.wdchub.sellerdata.controller;

import jakarta.validation.Valid;
import kr.co.wdchub.sellerdata.dto.SignupForm;
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

    public SignupController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping("/signup")
    public String signupForm(Model model) {
        model.addAttribute("signupForm", new SignupForm());
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

        if (bindingResult.hasErrors()) {
            return "signup";
        }

        try {
            memberService.signup(form);
        } catch (IllegalArgumentException e) {
            // 파일 형식/크기 검증 실패 (FileStorageService에서 던짐)
            bindingResult.rejectValue("businessLicenseFile", "invalid", e.getMessage());
            return "signup";
        } catch (IllegalStateException e) {
            // 파일 저장 중 서버 오류
            bindingResult.reject("fileError", e.getMessage());
            return "signup";
        }

        return "redirect:/signup/complete";
    }

    @GetMapping("/signup/complete")
    public String signupComplete() {
        return "signup-complete";
    }
}
