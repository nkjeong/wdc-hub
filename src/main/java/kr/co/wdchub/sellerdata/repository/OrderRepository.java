package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Order;
import kr.co.wdchub.sellerdata.domain.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    Optional<Order> findByIdAndMemberId(Long id, Long memberId);

    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findAllByStatusOrderByCreatedAtDesc(OrderStatus status);

    /** 오늘 접수된 주문 수 (주문번호 뒤 네 자리 채번용) */
    long countByCreatedAtAfter(LocalDateTime from);
}
