package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.EsmSiteCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EsmSiteCategoryRepository extends JpaRepository<EsmSiteCategory, Long> {

    List<EsmSiteCategory> findByEsmCodeAndSiteOrderBySiteCode(String esmCode, String site);
}
