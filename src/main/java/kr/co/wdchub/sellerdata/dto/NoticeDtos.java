package kr.co.wdchub.sellerdata.dto;

import kr.co.wdchub.sellerdata.domain.NoticeTag;

import java.time.LocalDateTime;

public class NoticeDtos {

    /** 등록/수정 폼 값 (파일은 별도 MultipartFile로 받음) */
    public record NoticeRequest(NoticeTag tag, String title, String content) {}

    public record NoticeResponse(
            Long id,
            NoticeTag tag,
            String tagLabel,
            String title,
            String content,
            String attachmentUrl,
            String attachmentFileName,
            LocalDateTime createdAt
    ) {}
}
