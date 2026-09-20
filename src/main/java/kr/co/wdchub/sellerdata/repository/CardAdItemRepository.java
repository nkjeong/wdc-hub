package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.CardAdItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardAdItemRepository extends JpaRepository<CardAdItem, Long> {

    List<CardAdItem> findBySlotKeyOrderBySortOrderAsc(String slotKey);

    void deleteBySlotKey(String slotKey);
}
