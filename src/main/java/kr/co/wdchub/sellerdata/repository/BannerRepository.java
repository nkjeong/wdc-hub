package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {

    List<Banner> findAllBySlotKeyOrderBySortOrderAscIdAsc(String slotKey);

    long countBySlotKey(String slotKey);
}
