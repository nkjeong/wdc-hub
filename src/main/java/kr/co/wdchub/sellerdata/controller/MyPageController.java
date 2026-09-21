package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.MarketSite;
import kr.co.wdchub.sellerdata.domain.MemberMarketAccount;
import kr.co.wdchub.sellerdata.dto.MarketAccountInput;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.BasicRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.BusinessRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.PasswordRequest;
import kr.co.wdchub.sellerdata.dto.MyPageDtos.ProfileDto;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MarketAccountService;
import kr.co.wdchub.sellerdata.service.MemberProfileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 마이페이지(회원정보). 로그인한 본인의 정보만 보고 고칠 수 있습니다. (관리자도 자기 계정 기준)
 * - GET  /mypage                  : 화면
 * - POST /mypage/basic            : 이름·이메일·휴대폰 수정
 * - POST /mypage/password         : 비밀번호 변경
 * - POST /mypage/business         : 사업자 정보 수정 (상호·대표자·업태·종목·주소·대표번호·팩스)
 * - POST /mypage/market-accounts  : 오픈마켓 아이디 전체 저장 (추가·수정·삭제를 한 번에)
 */
@Controller
@RequestMapping("/mypage")
public class MyPageController {

    private final MemberProfileService profileService;
    private final MarketAccountService marketAccountService;

    public MyPageController(MemberProfileService profileService, MarketAccountService marketAccountService) {
        this.profileService = profileService;
        this.marketAccountService = marketAccountService;
    }

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails user, Model model) {
        Long memberId = user.getMember().getId();
        ProfileDto profile = profileService.getProfile(memberId);
        List<MemberMarketAccount> accounts = marketAccountService.findByMember(memberId);

        model.addAttribute("profile", profile);
        model.addAttribute("companyName", profile.companyName());
        model.addAttribute("marketSites", MarketSite.values());
        model.addAttribute("marketAccounts", accounts);
        return "mypage"; // templates/mypage.html
    }

    @PostMapping("/basic")
    @ResponseBody
    public ProfileDto updateBasic(@RequestBody BasicRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        return profileService.updateBasic(user.getMember().getId(), req, user.getMember());
    }

    @PostMapping("/password")
    @ResponseBody
    public void changePassword(@RequestBody PasswordRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        profileService.changePassword(user.getMember().getId(), req, user.getMember());
    }

    @PostMapping("/business")
    @ResponseBody
    public ProfileDto updateBusiness(@RequestBody BusinessRequest req, @AuthenticationPrincipal CustomUserDetails user) {
        return profileService.updateBusiness(user.getMember().getId(), req, user.getMember());
    }

    @PostMapping("/market-accounts")
    @ResponseBody
    public List<MarketAccountInput> saveMarketAccounts(@RequestBody List<MarketAccountInput> inputs,
                                                       @AuthenticationPrincipal CustomUserDetails user) {
        return marketAccountService.replaceForMember(user.getMember().getId(), inputs).stream()
                .map(a -> {
                    MarketAccountInput out = new MarketAccountInput();
                    out.setSite(a.getSite());
                    out.setAccountId(a.getAccountId());
                    return out;
                })
                .toList();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}
