package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.FeaturedBrand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeaturedBrandRepository extends JpaRepository<FeaturedBrand, Long> {

    List<FeaturedBrand> findAllByOrderBySortOrderAsc();
}
