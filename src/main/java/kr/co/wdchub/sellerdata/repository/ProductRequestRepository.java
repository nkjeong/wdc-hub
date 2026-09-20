package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.ProductRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRequestRepository extends JpaRepository<ProductRequest, Long> {

    List<ProductRequest> findAllByOrderByCreatedAtDesc();

    List<ProductRequest> findAllByRequesterUsernameOrderByCreatedAtDesc(String requesterUsername);
}
