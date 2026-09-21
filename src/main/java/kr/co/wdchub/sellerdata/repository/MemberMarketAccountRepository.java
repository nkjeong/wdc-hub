package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.MarketSite;
import kr.co.wdchub.sellerdata.domain.MemberMarketAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberMarketAccountRepository extends JpaRepository<MemberMarketAccount, Long> {

    List<MemberMarketAccount> findByMemberIdOrderBySortOrderAscIdAsc(Long memberId);

    List<MemberMarketAccount> findByMemberIdAndSiteOrderBySortOrderAscIdAsc(Long memberId, MarketSite site);

    void deleteByMemberId(Long memberId);
}
