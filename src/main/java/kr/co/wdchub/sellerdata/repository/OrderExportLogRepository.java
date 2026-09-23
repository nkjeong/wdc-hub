package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.OrderExportLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderExportLogRepository extends JpaRepository<OrderExportLog, Long> {

    List<OrderExportLog> findTop20ByOrderByExportedAtDesc();
}
