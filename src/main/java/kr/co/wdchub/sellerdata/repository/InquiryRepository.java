package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    List<Inquiry> findAllByOrderByCreatedAtDesc();

    List<Inquiry> findAllByRequesterUsernameOrderByCreatedAtDesc(String requesterUsername);
}
