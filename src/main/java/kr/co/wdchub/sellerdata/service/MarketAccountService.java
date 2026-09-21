package kr.co.wdchub.sellerdata.service;

import kr.co.wdchub.sellerdata.domain.MarketSite;
import kr.co.wdchub.sellerdata.domain.MemberMarketAccount;
import kr.co.wdchub.sellerdata.dto.MarketAccountInput;
import kr.co.wdchub.sellerdata.repository.MemberMarketAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 회원의 오픈마켓 판매자 아이디 저장. 입력은 선택 사항입니다.
 * - 비어 있는 줄(아이디를 안 적은 줄)은 조용히 건너뜁니다.
 * - 아이디는 적었는데 사이트를 안 골랐으면 안내 오류를 냅니다.
 * - 같은 (사이트, 아이디)를 두 번 적어도 한 번만 저장합니다.
 */
@Service
@RequiredArgsConstructor
public class MarketAccountService {

    public static final int MAX_ACCOUNTS = 30;
    private static final int MAX_ID_LENGTH = 50;
    /** 영문, 숫자, 점, 밑줄, 하이픈, @ 만 허용 (오픈마켓 아이디에 흔히 쓰이는 문자) */
    private static final Pattern ID_PATTERN = Pattern.compile("^[A-Za-z0-9._@-]+$");

    private final MemberMarketAccountRepository repository;

    /**
     * 입력한 줄들을 검사하고 정리합니다. 문제가 있으면 안내 문구와 함께 IllegalArgumentException을 던집니다.
     * 컨트롤러가 가입 처리 전에 부르면(validate) 화면에 오류를 되돌려 줄 수 있어요.
     */
    public void validate(List<MarketAccountInput> inputs) {
        normalize(inputs);
    }

    /** 회원가입 직후 호출합니다. 회원가입과 같은 트랜잭션 안에서 저장돼서, 실패하면 가입도 함께 취소됩니다. */
    @Transactional
    public void saveForMember(Long memberId, List<MarketAccountInput> inputs) {
        List<NormalizedAccount> list = normalize(inputs);
        if (list.isEmpty()) return;

        List<MemberMarketAccount> toSave = new ArrayList<>();
        int order = 0;
        for (NormalizedAccount n : list) {
            toSave.add(MemberMarketAccount.builder()
                    .memberId(memberId).site(n.site()).accountId(n.accountId()).sortOrder(order++).build());
        }
        repository.saveAll(toSave);
    }

    /**
     * 마이페이지에서 "저장"을 눌렀을 때: 화면에 있는 줄 전체로 기존 아이디를 통째로 바꿉니다.
     * (추가, 수정, 삭제를 한 번에 처리. 줄을 지우면 그 아이디가 삭제됩니다.)
     */
    @Transactional
    public List<MemberMarketAccount> replaceForMember(Long memberId, List<MarketAccountInput> inputs) {
        List<NormalizedAccount> list = normalize(inputs);   // 형식이 틀리면 여기서 안내 문구와 함께 중단

        repository.deleteByMemberId(memberId);
        repository.flush(); // 삭제를 먼저 DB에 반영해야, 같은 (사이트, 아이디)를 다시 넣을 때 유니크 오류가 나지 않습니다

        List<MemberMarketAccount> toSave = new ArrayList<>();
        int order = 0;
        for (NormalizedAccount n : list) {
            toSave.add(MemberMarketAccount.builder()
                    .memberId(memberId).site(n.site()).accountId(n.accountId()).sortOrder(order++).build());
        }
        return repository.saveAll(toSave);
    }

    private record NormalizedAccount(MarketSite site, String accountId) {}

    private List<NormalizedAccount> normalize(List<MarketAccountInput> inputs) {
        List<NormalizedAccount> result = new ArrayList<>();
        if (inputs == null) return result;

        Set<String> seen = new LinkedHashSet<>();
        for (MarketAccountInput in : inputs) {
            if (in == null) continue;
            String id = in.getAccountId() == null ? "" : in.getAccountId().trim();
            if (id.isEmpty()) continue; // 비어 있는 줄은 건너뜀

            MarketSite site = in.getSite();
            if (site == null) {
                throw new IllegalArgumentException("오픈마켓 아이디 '" + id + "'의 사이트를 선택해 주세요.");
            }
            if (id.length() > MAX_ID_LENGTH) {
                throw new IllegalArgumentException("오픈마켓 아이디는 " + MAX_ID_LENGTH + "자 이내로 입력해 주세요.");
            }
            if (!ID_PATTERN.matcher(id).matches()) {
                throw new IllegalArgumentException("오픈마켓 아이디에는 영문, 숫자, . _ - @ 만 쓸 수 있어요: " + id);
            }
            if (!seen.add(site.name() + "|" + id.toLowerCase())) continue; // 같은 사이트의 같은 아이디는 한 번만

            result.add(new NormalizedAccount(site, id));
            if (result.size() > MAX_ACCOUNTS) {
                throw new IllegalArgumentException("오픈마켓 아이디는 최대 " + MAX_ACCOUNTS + "개까지 등록할 수 있어요.");
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<MemberMarketAccount> findByMember(Long memberId) {
        return repository.findByMemberIdOrderBySortOrderAscIdAsc(memberId);
    }

    /** 특정 사이트의 아이디 목록 (예: G마켓 등록 양식의 'G 판매자ID'를 고를 때) */
    @Transactional(readOnly = true)
    public List<MemberMarketAccount> findByMemberAndSite(Long memberId, MarketSite site) {
        return repository.findByMemberIdAndSiteOrderBySortOrderAscIdAsc(memberId, site);
    }
}
