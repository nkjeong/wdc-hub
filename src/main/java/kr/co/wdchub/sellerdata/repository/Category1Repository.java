package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Category1;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Category1Repository extends JpaRepository<Category1, Long> {

    Optional<Category1> findByCategoryCode(String categoryCode);

    boolean existsByCategoryCode(String categoryCode);

    List<Category1> findAllByUseYnTrueOrderBySortOrderAsc();

    List<Category1> findAllByOrderBySortOrderAsc();
}
