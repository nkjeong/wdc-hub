package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.ProductOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductOptionRepository extends JpaRepository<ProductOption, Long> {

    Optional<ProductOption> findByOptionCode(String optionCode);

    boolean existsByOptionCode(String optionCode);

    List<ProductOption> findAllByProduct_IdOrderBySortOrderAsc(Long productId);

    List<ProductOption> findAllByProduct_IdAndUseYnTrueOrderBySortOrderAsc(Long productId);

    long countByProduct_Id(Long productId);

    void deleteAllByProduct_Id(Long productId);
}
