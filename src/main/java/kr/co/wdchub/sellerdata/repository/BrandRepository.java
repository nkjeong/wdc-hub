package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Brand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findByBrandCode(String brandCode);

    boolean existsByBrandCode(String brandCode);

    List<Brand> findAllByOrderBySortOrderAsc();

    List<Brand> findAllByUseYnTrueOrderBySortOrderAsc();

    List<Brand> findAllByCategory1_IdOrderBySortOrderAsc(Long category1Id);

    /** 브랜드명(국문/영문) 검색용 */
    List<Brand> findAllByBrandNameKrContainingOrBrandNameEnContainingOrderBySortOrderAsc(
            String nameKr, String nameEn);
}
