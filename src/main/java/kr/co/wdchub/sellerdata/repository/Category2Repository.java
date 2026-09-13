package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Category2;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Category2Repository extends JpaRepository<Category2, Long> {

    Optional<Category2> findByCategoryCode(String categoryCode);

    boolean existsByCategoryCode(String categoryCode);

    List<Category2> findAllByCategory1_IdAndUseYnTrueOrderBySortOrderAsc(Long category1Id);

    List<Category2> findAllByCategory1_IdOrderBySortOrderAsc(Long category1Id);
}
