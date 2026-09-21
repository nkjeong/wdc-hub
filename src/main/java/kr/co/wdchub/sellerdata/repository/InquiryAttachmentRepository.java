package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.InquiryAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface InquiryAttachmentRepository extends JpaRepository<InquiryAttachment, Long> {

    List<InquiryAttachment> findByInquiryId(Long inquiryId);

    List<InquiryAttachment> findByInquiryIdIn(Collection<Long> inquiryIds);
}
