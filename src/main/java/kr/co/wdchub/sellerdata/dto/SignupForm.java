package kr.co.wdchub.sellerdata.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class SignupForm {

    @NotBlank(message = "아이디를 입력해주세요.")
    @Pattern(regexp = "^[a-zA-Z0-9]{4,20}$", message = "아이디는 영문/숫자 4~20자로 입력해주세요.")
    private String loginId;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String password;

    @NotBlank(message = "비밀번호 확인을 입력해주세요.")
    private String passwordConfirm;

    @NotBlank(message = "담당자 이름을 입력해주세요.")
    private String name;

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "휴대폰 번호를 입력해주세요.")
    private String phoneNumber;

    @NotBlank(message = "상호명을 입력해주세요.")
    private String companyName;

    @NotBlank(message = "대표자명을 입력해주세요.")
    private String ceoName;

    @NotBlank(message = "사업자등록번호를 입력해주세요.")
    private String businessRegistrationNumber;

    // 아래는 선택 입력 항목이라 검증 어노테이션 없음
    private String businessType;
    private String businessCategory;
    private String zonecode;
    private String companyAddress;
    private String addressDetail;
    private String companyPhone;
    private String companyFax;

    private boolean agreeTerms;

    // 사업자등록증 파일 (선택 첨부, JPG/PNG/PDF)
    private MultipartFile businessLicenseFile;

    // 오픈마켓 판매자 아이디 (선택 입력). 한 사이트에 여러 개일 수 있어서 (사이트, 아이디) 줄을 원하는 만큼 받습니다.
    // 폼 필드 이름: marketAccounts[0].site, marketAccounts[0].accountId, marketAccounts[1].site ...
    private List<MarketAccountInput> marketAccounts = new ArrayList<>();
}
