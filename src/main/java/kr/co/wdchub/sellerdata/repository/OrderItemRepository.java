package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderIdOrderById(Long orderId);

    List<OrderItem> findByOrderIdInOrderById(Collection<Long> orderIds);
}
