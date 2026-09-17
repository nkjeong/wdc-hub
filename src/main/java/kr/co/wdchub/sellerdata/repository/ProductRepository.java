package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByOrderByCreatedAtDesc();

    List<Product> findAllByCategory1_IdOrderByCreatedAtDesc(Long category1Id);

    List<Product> findAllByCategory2_IdOrderByCreatedAtDesc(Long category2Id);

    List<Product> findAllByCategory3_IdOrderByCreatedAtDesc(Long category3Id);

    List<Product> findAllByBrand_IdOrderByCreatedAtDesc(Long brandId);

    List<Product> findAllByProductNameContainingOrBarcodeContainingOrProductNumberContainingOrderByCreatedAtDesc(
            String productName, String barcode, String productNumber);

    // ── 대시보드 통계용 ──────────────────────────

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByBundleYnTrue();

    long countByImportedYnTrue();

    long countByNewProductYnTrue();

    long countByBundleYnTrueAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByImportedYnTrueAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByCreatedAtBetweenAndBundleYnFalseAndImportedYnFalse(LocalDateTime start, LocalDateTime end);

    long countByBundleYnFalseAndImportedYnFalse();
}
