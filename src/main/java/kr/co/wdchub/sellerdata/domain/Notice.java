package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** 공지사항. 대시보드 위젯(최근 4개)과 공지사항 전체보기 화면, 관리자 공지사항관리 화면에서 함께 사용합니다. */
@Entity
@Table(name = "notice")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tag", nullable = false, length = 20)
    private NoticeTag tag;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** 공지 내용 (기존 공지는 null일 수 있음) */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** 첨부파일 주소 (시놀로지가 돌려준 절대 URL) */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    /** 첨부파일 원본 이름 (다운로드 표시용) */
    @Column(name = "attachment_file_name", length = 255)
    private String attachmentFileName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
