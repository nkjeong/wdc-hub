package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.MarketSite;
import kr.co.wdchub.sellerdata.domain.MemberMarketAccount;
import kr.co.wdchub.sellerdata.repository.EsmOriginRepository;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.MarketAccountService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "G마켓용 엑셀 다운로드"에 필요한 부가 정보.
 * 엑셀 자체는 브라우저에서 만들고(gmarket-export.js), 여기서는 아래 두 가지만 내려줍니다.
 *  - gmarketIds    : 로그인한 회원이 등록해 둔 G마켓 판매자 아이디 (양식의 'G 판매자ID' 칸)
 *  - originRegions : 원산지 코드 → 지역타입(국내산/해외수입)  (양식의 '원산지 지역타입' 칸)
 */
@RestController
@RequestMapping("/gmarket")
public class GmarketExportController {

    public record ExportMeta(List<String> gmarketIds, Map<String, String> originRegions) {}

    private final MarketAccountService marketAccountService;
    private final EsmOriginRepository originRepository;

    public GmarketExportController(MarketAccountService marketAccountService, EsmOriginRepository originRepository) {
        this.marketAccountService = marketAccountService;
        this.originRepository = originRepository;
    }

    @GetMapping("/export-meta")
    public ExportMeta meta(@AuthenticationPrincipal CustomUserDetails user) {
        List<String> ids = marketAccountService.findByMemberAndSite(user.getMember().getId(), MarketSite.GMARKET).stream()
                .map(MemberMarketAccount::getAccountId)
                .toList();

        Map<String, String> regions = new LinkedHashMap<>();
        originRepository.findAll().forEach(o -> regions.put(o.getOriginCode(), o.getRegionType()));
        return new ExportMeta(ids, regions);
    }
}
