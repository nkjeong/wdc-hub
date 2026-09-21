package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.EsmCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * "G마켓에 실제로 쓸 수 있는 카테고리"란: G마켓 대응 코드가 있고, 테스트용으로 만들어 둔 항목이 아닌 것입니다.
 * (원본 표에 '-' 대분류, '스마일클럽 테스트', 'test' 같은 임시 항목이 섞여 있어서 뺍니다.)
 */
public interface EsmCategoryRepository extends JpaRepository<EsmCategory, String> {

    String USABLE = "exists (select 1 from EsmSiteCategory s where s.esmCode = c.esmCode and s.site = 'G') "
            + "and c.topName <> '-' and c.namePath not like '%test%' and c.namePath not like '%테스트%'";

    /** 1차(대분류) 이름 목록 */
    @Query("select distinct c.level1 from EsmCategory c where " + USABLE + " order by c.level1")
    List<String> usableLevel1();

    /** 경로가 prefix로 시작하는 카테고리 (예: prefix = "식품>신선식품" → 그 아래 전부). 다음 단계 이름을 뽑을 때 씁니다. */
    @Query("select c from EsmCategory c where " + USABLE + " and c.namePath like concat(:prefix, '>%') order by c.namePath")
    List<EsmCategory> usableUnder(@Param("prefix") String prefix);

    /** G마켓에 쓸 수 있는 카테고리를 경로 이름으로 검색 */
    @Query("select c from EsmCategory c where " + USABLE + " and c.namePath like concat('%', :keyword, '%') order by c.namePath")
    List<EsmCategory> searchUsableForGmarket(@Param("keyword") String keyword);
}
