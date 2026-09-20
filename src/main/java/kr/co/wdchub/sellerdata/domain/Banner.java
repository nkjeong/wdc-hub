package kr.co.wdchub.sellerdata.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 대시보드 슬라이드 배너 이미지 한 장.
 * slotKey 로 어느 배너인지 구분합니다.
 *   - "super-flow" : 왼쪽 배너 (Super Flow 슬라이더)
 *   - "swiper-gl"  : 오른쪽 배너 (Swiper GL 슬라이더)
 * 이미지 파일은 시놀로지가 아니라 이 앱 서버의 uploads/banners 폴더에 저장됩니다.
 */
@Entity
@Table(name = "banner", indexes = @Index(name = "idx_banner_slot", columnList = "slot_key"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_key", nullable = false, length = 30)
    private String slotKey;

    /** 예: uploads/banners/3f2a....jpg (서버 기준 상대경로) */
    @Column(name = "image_path", nullable = false, length = 500)
    private String imagePath;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
