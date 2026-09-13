package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Category3;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Category3Repository extends JpaRepository<Category3, Long> {

    Optional<Category3> findByCategoryCode(String categoryCode);

    boolean existsByCategoryCode(String categoryCode);

    List<Category3> findAllByCategory2_IdAndUseYnTrueOrderBySortOrderAsc(Long category2Id);

    List<Category3> findAllByCategory2_IdOrderBySortOrderAsc(Long category2Id);
}
