package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;

/** 1:1 문의 첨부파일 (시놀로지 NAS에 저장된 파일 주소) */
@Entity
@Table(name = "inquiry_attachment", indexes = @Index(name = "idx_inquiry_att_inquiry", columnList = "inquiry_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquiryAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Inquiry.id (FK 제약은 걸지 않고 값만 저장) */
    @Column(name = "inquiry_id", nullable = false)
    private Long inquiryId;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;
}
