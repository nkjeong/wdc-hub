package kr.co.wdchub.sellerdata.dto;

import kr.co.wdchub.sellerdata.domain.InquiryCategory;
import kr.co.wdchub.sellerdata.domain.InquiryStatus;

import java.time.LocalDateTime;
import java.util.List;

public class InquiryDtos {

    /** 회원이 접수할 때 (첨부파일은 별도 MultipartFile로 받음) */
    public record InquiryRequest(InquiryCategory category, String title, String content) {}

    /** 관리자가 답변/상태를 저장할 때 */
    public record AnswerRequest(InquiryStatus status, String answer) {}

    public record AttachmentDto(Long id, String fileName) {}

    public record InquiryDto(
            Long id,
            String category,
            String categoryLabel,
            String title,
            String content,
            String status,
            String statusLabel,
            String answer,
            LocalDateTime answeredAt,
            String requesterUsername,
            String requesterCompany,
            LocalDateTime createdAt,
            List<AttachmentDto> attachments
    ) {}
}
